"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = require("grpc");
const exponential_1 = require("./backoff/exponential");
const errors_1 = require("./errors");
const shared_pool_1 = require("./shared-pool");
const util_1 = require("./util");
const services = grpc.load(`${__dirname}/../proto/rpc.proto`);
exports.defaultBackoffStrategy = new exponential_1.ExponentialBackoff({
    initial: 300,
    max: 10 * 1000,
    random: 1,
});
const secureProtocolPrefix = 'https:';
/**
 * Strips the https?:// from the start of the connection string.
 * @param {string} name [description]
 */
function removeProtocolPrefix(name) {
    return name.replace(/^https?:\/\//, '');
}
/**
 * Executes a grpc service calls, casting the error (if any) and wrapping
 * into a Promise.
 */
function runServiceCall(client, metadata, options, method, payload) {
    return new Promise((resolve, reject) => {
        client[method](payload, metadata, options, (err, res) => {
            if (err) {
                reject(errors_1.castGrpcError(err));
            }
            else {
                resolve(res);
            }
        });
    });
}
/**
 * Retrieves and returns an auth token for accessing etcd. This function is
 * based on the algorithm in {@link https://git.io/vHzwh}.
 */
class Authenticator {
    constructor(options, credentials) {
        this.options = options;
        this.credentials = credentials;
        this.awaitingMetadata = null;
    }
    /**
     * Invalides the cached metadata. Clients should call this if they detect
     * that the authentication is no longer valid.
     */
    invalidateMetadata() {
        this.awaitingMetadata = null;
    }
    /**
     * Returns metadata used to make a call to etcd.
     */
    getMetadata() {
        if (this.awaitingMetadata !== null) {
            return this.awaitingMetadata;
        }
        const hosts = typeof this.options.hosts === 'string' ? [this.options.hosts] : this.options.hosts;
        const auth = this.options.auth;
        if (!auth) {
            return Promise.resolve(new grpc.Metadata());
        }
        const attempt = (index, previousRejection) => {
            if (index >= hosts.length) {
                this.awaitingMetadata = null;
                return Promise.reject(previousRejection);
            }
            const meta = new grpc.Metadata();
            const host = removeProtocolPrefix(hosts[index]);
            return this.getCredentialsFromHost(host, auth.username, auth.password, this.credentials)
                .then(token => {
                meta.set('token', token);
                return meta;
            })
                .catch(err => attempt(index + 1, err));
        };
        return (this.awaitingMetadata = attempt(0));
    }
    /**
     * Retrieves an auth token from etcd.
     */
    getCredentialsFromHost(address, name, password, credentials) {
        return runServiceCall(new services.etcdserverpb.Auth(address, credentials), new grpc.Metadata(), undefined, 'authenticate', { name, password }).then(res => res.token);
    }
}
/**
 * A Host is one instance of the etcd server, which can contain multiple
 * services. It holds GRPC clients to communicate with the host, and will
 * be removed from the connection pool upon server failures.
 */
class Host {
    constructor(host, channelCredentials, channelOptions) {
        this.channelCredentials = channelCredentials;
        this.channelOptions = channelOptions;
        this.cachedServices = Object.create(null);
        this.host = removeProtocolPrefix(host);
    }
    /**
     * Returns the given GRPC service on the current host.
     */
    getServiceClient(name) {
        const service = this.cachedServices[name];
        if (service) {
            return service;
        }
        const newService = new services.etcdserverpb[name](this.host, this.channelCredentials, this.channelOptions);
        this.cachedServices[name] = newService;
        return newService;
    }
    /**
     * Close frees resources associated with the host, tearing down any
     * existing client
     */
    close() {
        util_1.forOwn(this.cachedServices, (service) => grpc.closeClient(service));
        this.cachedServices = Object.create(null);
    }
}
exports.Host = Host;
/**
 * Connection wraps GRPC hosts. Note that this wraps the hosts themselves; each
 * host can contain multiple discreet services.
 */
class ConnectionPool {
    constructor(options) {
        this.options = options;
        this.pool = new shared_pool_1.SharedPool(this.options.backoffStrategy || exports.defaultBackoffStrategy);
        this.seedHosts();
    }
    /**
     * Sets a mock interface to use instead of hitting real services.
     */
    mock(callable) {
        this.mockImpl = callable;
    }
    /**
     * Removes any existing mock.
     */
    unmock() {
        this.mockImpl = null;
    }
    /**
     * Tears down all ongoing connections and resoruces.
     */
    close() {
        this.pool.all().forEach(host => host.close());
    }
    /**
     * @override
     */
    exec(serviceName, method, payload, options) {
        if (this.mockImpl) {
            return this.mockImpl.exec(serviceName, method, payload);
        }
        return this.getConnection(serviceName).then(({ resource, client, metadata }) => {
            return runServiceCall(client, metadata, options, method, payload)
                .then(res => {
                this.pool.succeed(resource);
                return res;
            })
                .catch(err => {
                if (err instanceof errors_1.EtcdInvalidAuthTokenError) {
                    this.authenticator.invalidateMetadata();
                    return this.exec(serviceName, method, payload, options);
                }
                if (err instanceof errors_1.GRPCGenericError) {
                    this.pool.fail(resource);
                    resource.close();
                    if (this.pool.available().length && this.options.retry) {
                        return this.exec(serviceName, method, payload, options);
                    }
                }
                throw err;
            });
        });
    }
    /**
     * @override
     */
    getConnection(service) {
        if (this.mockImpl) {
            return Promise.resolve(this.mockImpl.getConnection(service)).then(connection => (Object.assign({ metadata: new grpc.Metadata() }, connection)));
        }
        return Promise.all([this.pool.pull(), this.authenticator.getMetadata()]).then(([host, metadata]) => {
            const client = host.getServiceClient(service);
            return { resource: host, client, metadata };
        });
    }
    /**
     * @override
     */
    markFailed(host) {
        this.pool.fail(host);
    }
    /**
     * Adds configured etcd hosts to the connection pool.
     */
    seedHosts() {
        const credentials = this.buildAuthentication();
        const { hosts, grpcOptions } = this.options;
        if (typeof hosts === 'string') {
            this.pool.add(new Host(hosts, credentials, grpcOptions));
            return;
        }
        if (hosts.length === 0) {
            throw new Error('Cannot construct an etcd client with no hosts specified');
        }
        hosts.forEach(host => this.pool.add(new Host(host, credentials, grpcOptions)));
    }
    /**
     * Creates authentication credentials to use for etcd clients.
     */
    buildAuthentication() {
        const { credentials } = this.options;
        let protocolCredentials = grpc.credentials.createInsecure();
        if (credentials) {
            protocolCredentials = grpc.credentials.createSsl(credentials.rootCertificate, credentials.privateKey, credentials.certChain);
        }
        else if (this.hasSecureHost()) {
            protocolCredentials = grpc.credentials.createSsl();
        }
        this.authenticator = new Authenticator(this.options, protocolCredentials);
        return protocolCredentials;
    }
    /**
     * Returns whether any configured host is set up to use TLS.
     */
    hasSecureHost() {
        const { hosts } = this.options;
        if (typeof hosts === 'string') {
            return hosts.startsWith(secureProtocolPrefix);
        }
        const countSecure = hosts.filter(host => host.startsWith(secureProtocolPrefix)).length;
        if (countSecure === 0) {
            return false;
        }
        if (countSecure < hosts.length) {
            throw new Error('etcd3 cannot be configured with a mix of secure and insecure hosts');
        }
        return true;
    }
}
exports.ConnectionPool = ConnectionPool;
