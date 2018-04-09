"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const builder_1 = require("./builder");
const errors_1 = require("./errors");
const RPC = require("./rpc");
function throwIfError(value) {
    if (value instanceof Error) {
        throw value;
    }
    return value;
}
function leaseExpired(lease) {
    return lease.TTL === '0';
}
/**
 * Implements RPC.ICallable. Wraps a pool and adds the `leaseID` to outgoing
 * put requests before executing them.
 */
class LeaseClientWrapper {
    constructor(pool, lease) {
        this.pool = pool;
        this.lease = lease;
    }
    exec(service, method, payload) {
        return this.lease.leaseID
            .then(throwIfError)
            .then(lease => {
            payload.lease = lease;
            return this.pool.exec(service, method, payload);
        })
            .catch(err => {
            if (err instanceof errors_1.EtcdLeaseInvalidError) {
                this.lease.emitLoss(err);
            }
            throw err;
        });
    }
    getConnection() {
        throw new Error('not supported');
    }
}
/**
 * Lease is a high-level manager for etcd leases.
 * Leases are great for things like service discovery:
 *
 * ```
 * const os = require('os');
 * const { Etcd3 } = require('etcd3');
 * const client = new Etcd3();
 *
 * const hostPrefix = 'available-hosts/';
 *
 * function grantLease() {
 *   const lease = client.lease();
 *
 *   lease.on('lost', err => {
 *     console.log('We lost our lease as a result of this error:', err);
 *     console.log('Trying to re-grant it...');
 *     grantLease();
 *   })
 *
 *   await lease.put(hostPrefix + os.hostname()).value('');
 * }
 *
 * function getAvailableHosts() {
 *   const keys = await client.get().keys().strings();
 *   return keys.map(key => key.slice(hostPrefix.length));
 * }
 * ```
 */
class Lease extends events_1.EventEmitter {
    constructor(pool, namespace, ttl, options) {
        super();
        this.pool = pool;
        this.namespace = namespace;
        this.ttl = ttl;
        this.options = options;
        this.state = 0 /* Alive */;
        this.client = new RPC.LeaseClient(this.pool);
        this.teardown = () => {
            /* noop */
        };
        if (ttl < 1) {
            throw new Error(`The TTL in an etcd lease must be at least 1 second. Got: ${ttl}`);
        }
        this.leaseID = this.client
            .leaseGrant({ TTL: ttl }, this.options)
            .then(res => {
            this.state = 0 /* Alive */;
            this.lastKeepAlive = Date.now();
            this.keepalive();
            return res.ID;
        })
            .catch(err => {
            this.emitLoss(err);
            // return, don't throw, from here so that if no one is listening to
            // grant() we don't crash the process.
            return err;
        });
    }
    /**
     * Grant waits for the lease to be granted. You generally don't need to
     * call this, as any operations with `.put` will queue automatically.
     *
     * Calling this multiple times is safe; it won't try to request multipl leases.
     *
     * It rejects if the lease cannot be granted, in additon to the `lost`
     * event firing.
     */
    grant() {
        return this.leaseID.then(throwIfError);
    }
    /**
     * Revoke frees the lease from etcd. Keys that the lease owns will be
     * evicted.
     */
    revoke(options = this.options) {
        this.close();
        return this.leaseID.then(id => {
            if (!(id instanceof Error)) {
                // if an error, we didn't grant in the first place
                return this.client.leaseRevoke({ ID: id }, options).then(() => undefined);
            }
            return undefined;
        });
    }
    /**
     * Put returns a put builder that operates within the current lease.
     */
    put(key) {
        return new builder_1.PutBuilder(new RPC.KVClient(new LeaseClientWrapper(this.pool, this)), this.namespace, key);
    }
    /**
     * keepaliveOnce fires an immediate keepalive for the lease.
     */
    keepaliveOnce(options = this.options) {
        return Promise.all([this.client.leaseKeepAlive(options), this.grant()]).then(([stream, id]) => {
            return new Promise((resolve, reject) => {
                stream.on('data', resolve);
                stream.on('error', err => reject(errors_1.castGrpcError(err)));
                stream.write({ ID: id });
            }).then(res => {
                stream.end();
                if (leaseExpired(res)) {
                    const err = new errors_1.EtcdLeaseInvalidError(res.ID);
                    this.emitLoss(err);
                    throw err;
                }
                return res;
            });
        });
    }
    /**
     * Returns whether etcd has told us that this lease revoked.
     */
    revoked() {
        return this.state === 1 /* Revoked */;
    }
    /**
     * Implements EventEmitter.on(...).
     */
    on(event, handler) {
        // tslint:disable-line
        return super.on(event, handler);
    }
    /**
     * Tears down resources associated with the lease.
     */
    close() {
        this.state = 1 /* Revoked */;
        this.teardown();
    }
    /**
     * Emits the error as having caused this lease to die, and tears
     * down the lease.
     */
    emitLoss(err) {
        this.close();
        this.emit('lost', err);
    }
    /**
     * keepalive starts a loop keeping the lease alive.
     */
    keepalive() {
        // When the cluster goes down, we keep trying to reconnect. But if we're
        // far past the end of our key's TTL, there's no way we're going to be
        // able to renew it. Fire a "lost".
        if (Date.now() - this.lastKeepAlive > 2 * 1000 * this.ttl) {
            this.close();
            this.emit('lost', new errors_1.GRPCConnectFailedError('We lost connection to etcd and our lease has expired.'));
            return;
        }
        this.client
            .leaseKeepAlive()
            .then(stream => {
            if (this.state !== 0 /* Alive */) {
                return stream.end();
            }
            const keepaliveTimer = setInterval(() => this.fireKeepAlive(stream), 1000 * this.ttl / 3);
            this.teardown = () => {
                this.teardown = () => undefined;
                clearInterval(keepaliveTimer);
                stream.end();
            };
            stream.on('error', err => this.handleKeepaliveError(err)).on('data', res => {
                if (leaseExpired(res)) {
                    return this.handleKeepaliveError(new errors_1.EtcdLeaseInvalidError(res.ID));
                }
                this.lastKeepAlive = Date.now();
                this.emit('keepaliveSucceeded', res);
            });
            this.emit('keepaliveEstablished');
            this.fireKeepAlive(stream);
        })
            .catch(err => this.handleKeepaliveError(err));
    }
    fireKeepAlive(stream) {
        this.emit('keepaliveFired');
        this.grant()
            .then(id => stream.write({ ID: id }))
            .catch(() => this.close()); // will only throw if the initial grant failed
    }
    handleKeepaliveError(err) {
        this.emit('keepaliveFailed', errors_1.castGrpcError(err));
        this.teardown();
        if (err instanceof errors_1.EtcdLeaseInvalidError) {
            this.emitLoss(err);
        }
        else {
            setTimeout(() => this.keepalive(), 100);
        }
    }
}
exports.Lease = Lease;
