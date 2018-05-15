/// <reference types="node" />
import { EventEmitter } from 'events';
import * as grpc from 'grpc';
import { PutBuilder } from './builder';
import { ConnectionPool } from './connection-pool';
import { EtcdError } from './errors';
import * as RPC from './rpc';
import { NSApplicator } from './util';
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
 *   const lease = client.lease(10); // set a TTL of 10 seconds
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
export declare class Lease extends EventEmitter {
    private readonly pool;
    private readonly namespace;
    private ttl;
    private readonly options;
    private leaseID;
    private state;
    private client;
    private lastKeepAlive;
    constructor(pool: ConnectionPool, namespace: NSApplicator, ttl: number, options?: grpc.CallOptions | undefined);
    /**
     * Grant waits for the lease to be granted. You generally don't need to
     * call this, as any operations with `.put` will queue automatically.
     *
     * Calling this multiple times is safe; it won't try to request multipl leases.
     *
     * It rejects if the lease cannot be granted, in additon to the `lost`
     * event firing.
     */
    grant(): Promise<string>;
    /**
     * Revoke frees the lease from etcd. Keys that the lease owns will be
     * evicted.
     */
    revoke(options?: grpc.CallOptions | undefined): Promise<void>;
    /**
     * releasePassively stops making heartbeats for the lease, and allows it
     * to expire automatically when its TTL rolls around. Use `revoke()` to
     * actively tell etcd to terminate the lease.
     */
    release(): void;
    /**
     * Put returns a put builder that operates within the current lease.
     */
    put(key: string | Buffer): PutBuilder;
    /**
     * keepaliveOnce fires an immediate keepalive for the lease.
     */
    keepaliveOnce(options?: grpc.CallOptions | undefined): Promise<RPC.ILeaseKeepAliveResponse>;
    /**
     * Returns whether etcd has told us that this lease revoked.
     */
    revoked(): boolean;
    /**
     * A `lost` event is fired when etcd indicates that we've lost the lease
     * on this client. This can be a result of a number of events:
     *  - We've not been able to contact etcd for a while and our TTL has
     *    definitely expired (emits a EtcdLeaseInvalidError)
     *  - We contacted etcd and it said that the lease was expired, or revoked
     *    (emits a EtcdLeaseInvalidError).
     *  - We weren't able to get an initial grant for the lease.
     * This is NOT fired if `revoke()` is called manually.
     */
    on(event: 'lost', handler: (err: EtcdError) => void): this;
    /**
     * keepaliveFired is emitted whenever we start
     * trying to send a lease keepalive.
     */
    on(event: 'keepaliveFired', handler: () => void): this;
    /**
     * keepaliveSucceeded is emitted when we successfully hit etcd
     * with a keepalive for this lease.
     */
    on(event: 'keepaliveSucceeded', handler: (res: RPC.ILeaseKeepAliveResponse) => void): this;
    /**
     * keepaliveFailed is emitted when an error happens in the keepalive loop.
     * We may be able to recover (e.g. by connecting to a different server),
     * the lease should not be considered revoked until `lost` is emitted.
     */
    on(event: 'keepaliveFailed', handler: (res: RPC.ILeaseKeepAliveResponse) => void): this;
    /**
     * keepaliveEstablished is emitted when a stream opens that we'll use for
     * keepalives. This is mostly for testing.
     */
    on(event: 'keepaliveEstablished', handler: () => void): this;
    private teardown;
    /**
     * Tears down resources associated with the lease.
     */
    private close();
    /**
     * Emits the error as having caused this lease to die, and tears
     * down the lease.
     */
    private emitLoss(err);
    /**
     * keepalive starts a loop keeping the lease alive.
     */
    private keepalive();
    private fireKeepAlive(stream);
    private handleKeepaliveError(err);
}
