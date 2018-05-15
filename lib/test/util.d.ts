import { Etcd3, IOptions } from '../src';
/**
 * Proxy is a TCP proxy for etcd, used so that we can simulate network failures
 * and disruptions in a cross-platform manner (i.e no reliance on tcpkill
 * or ip link)
 */
export declare class Proxy {
    isActive: boolean;
    connections: {
        end(): void;
    }[];
    private server;
    private host;
    private port;
    /**
     * activate creates the proxy server.
     */
    activate(): Promise<void>;
    /**
     * pause temporarily shuts down the server, but does not 'deactivate' the
     * proxy; new connections will still try to hit it. Can be restored with
     * resume().
     */
    pause(): void;
    /**
     * Starts up a previously stopped server.
     */
    resume(): void;
    /**
     * Destroys a previously-active proxy server.
     */
    deactivate(): void;
    /**
     * Returns the address the server is listening on.
     */
    address(): string;
    private handleIncoming(clientCnx);
}
export declare const proxy: Proxy;
/**
 * Returns the host to test against.
 */
export declare function getHost(): string;
/**
 * Returns etcd options to use for connections.
 */
export declare function getOptions(defaults?: Partial<IOptions>): IOptions;
/**
 * Returns a promise that throws if the promise is resolved or rejected with
 * something other than the provided constructor
 */
export declare function expectReject(promise: Promise<any>, err: {
    new (message: string): Error;
}): Promise<void>;
/**
 * Creates an etcd client with the default options and seeds some keys.
 */
export declare function createTestClientAndKeys(): Promise<Etcd3>;
/**
 * Destroys the etcd client and wipes all keys.
 */
export declare function tearDownTestClient(client: Etcd3): Promise<void>;
