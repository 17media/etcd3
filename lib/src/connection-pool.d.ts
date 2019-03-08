import * as grpc from 'grpc';
import { ExponentialBackoff } from './backoff/exponential';
import { IOptions } from './options';
import { ICallable, Services } from './rpc';
export declare const defaultBackoffStrategy: ExponentialBackoff;
/**
 * A Host is one instance of the etcd server, which can contain multiple
 * services. It holds GRPC clients to communicate with the host, and will
 * be removed from the connection pool upon server failures.
 */
export declare class Host {
    private readonly channelCredentials;
    private readonly channelOptions;
    private readonly host;
    private cachedServices;
    constructor(host: string, channelCredentials: grpc.ChannelCredentials, channelOptions?: grpc.ChannelOptions | undefined);
    /**
     * Returns the given GRPC service on the current host.
     */
    getServiceClient(name: keyof typeof Services): grpc.Client;
    /**
     * Close frees resources associated with the host, tearing down any
     * existing client
     */
    close(): void;
}
/**
 * Connection wraps GRPC hosts. Note that this wraps the hosts themselves; each
 * host can contain multiple discreet services.
 */
export declare class ConnectionPool implements ICallable<Host> {
    private options;
    private pool;
    private mockImpl;
    private authenticator;
    constructor(options: IOptions);
    /**
     * Sets a mock interface to use instead of hitting real services.
     */
    mock(callable: ICallable<Host>): void;
    /**
     * Removes any existing mock.
     */
    unmock(): void;
    /**
     * Tears down all ongoing connections and resoruces.
     */
    close(): void;
    /**
     * @override
     */
    exec(serviceName: keyof typeof Services, method: string, payload: object, options?: grpc.CallOptions): Promise<any>;
    /**
     * @override
     */
    getConnection(service: keyof typeof Services): Promise<{
        resource: Host;
        client: grpc.Client;
        metadata: grpc.Metadata;
    }>;
    /**
     * @override
     */
    markFailed(host: Host): void;
    /**
     * Adds configured etcd hosts to the connection pool.
     */
    private seedHosts();
    /**
     * Creates authentication credentials to use for etcd clients.
     */
    private buildAuthentication();
    /**
     * Returns whether any configured host is set up to use TLS.
     */
    private hasSecureHost();
}
