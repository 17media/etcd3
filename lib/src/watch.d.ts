/// <reference types="node" />
import { EventEmitter } from 'events';
import { IBackoffStrategy } from './backoff/backoff';
import { EtcdError } from './errors';
import { Rangable } from './range';
import * as RPC from './rpc';
import { NSApplicator } from './util';
/**
 * The WatchManager is a singleton that exists in namespaces to handle watching
 * multiple keys in a single GRPC stream. The underlying stream will only be
 * alive if there's at least one watcher.
 *
 * This class is not exposed externally.
 */
export declare class WatchManager {
    private readonly client;
    private backoff;
    /**
     * Current state of the watcher.
     */
    private state;
    /**
     * The current GRPC stream, if any.
     */
    private stream;
    /**
     * List of attached watchers.
     */
    private watchers;
    /**
     * Set of watchers we're currently closing.
     */
    private expectedClosers;
    /**
     * Queue for attaching watchers. Unique and re-created per stream.
     */
    private queue;
    constructor(client: RPC.WatchClient, backoff: IBackoffStrategy);
    /**
     * Attach registers the watcher on the connection.
     */
    attach(watcher: Watcher): void;
    /**
     * Detaches a watcher from the connection.
     */
    detach(watcher: Watcher): Promise<void>;
    /**
     * Returns the current GRPC stream, *throwing* if we aren't in a state where
     * we can get the stream. Calls here are only valid if state == Connected
     */
    private getStream();
    /**
     * Establishes a GRPC watcher stream, if there are any active watcher.
     */
    private establishStream();
    /**
     * Closes the currently attached watcher stream.
     */
    private destroyStream();
    /**
     * Handles an error emission on the current stream. Emits a message out to
     * all attached watchers and tries to reconnect.
     */
    private handleError(err);
    /**
     * Handles a cancel update, gracefully closing the watcher if it's expected,
     * or emitting an error if it's not.
     */
    private handleCancelResponse(watcher, res);
    /**
     * Emits a data update on the target watcher.
     */
    private handleUpdateResponse(watcher, res);
    /**
     * Dispatches some watch response on the event stream.
     */
    private handleResponse(res);
}
export declare const operationNames: {
    put: RPC.FilterType;
    delete: RPC.FilterType;
};
/**
 * WatchBuilder is used for creating etcd watchers. The created watchers are
 * resilient against disconnections, automatically resubscribing and replaying
 * changes when reconnecting.
 *
 * ```
 * const client = new Etcd3();
 *
 * client.watch()
 *   .key('foo')
 *   .create()
 *   .then(watcher => {
 *     watcher
 *       .on('disconnected', () => console.log('disconnected...'))
 *       .on('connected', () => console.log('successfully reconnected!'))
 *       .on('put', res => console.log('foo got set to:', res.value.toString()));
 *   });
 * ```
 */
export declare class WatchBuilder {
    private readonly manager;
    private readonly namespace;
    private request;
    constructor(manager: WatchManager, namespace: NSApplicator);
    /**
     * Sets a single key to be watched.
     */
    key(key: string | Buffer): this;
    /**
     * Prefix instructs the watcher to watch all keys with the given prefix.
     */
    prefix(value: string | Buffer): this;
    /**
     * inRange instructs the builder to watch keys in the specified byte range.
     */
    inRange(r: Rangable): this;
    /**
     * ignore omits certain operation kinds from the watch stream.
     */
    ignore(...operations: (keyof typeof operationNames)[]): this;
    /**
     * Instructs the watcher to return the previous key/value pair in updates.
     */
    withPreviousKV(): this;
    /**
     * watcher() creates but does not connect the watcher. Use create() instead;
     * this is mostly for testing purposes.
     * @private
     */
    watcher(): Watcher;
    /**
     * Resolves the watch request into a Watcher, and fires off to etcd.
     */
    create(): Promise<Watcher>;
}
/**
 * The Watcher encapsulates
 */
export declare class Watcher extends EventEmitter {
    private readonly manager;
    private readonly namespace;
    readonly request: RPC.IWatchCreateRequest;
    /**
     * id is the watcher's ID in etcd. This is `null` initially and during
     * reconnections, only populated while the watcher is idle.
     */
    readonly id: string | null;
    constructor(manager: WatchManager, namespace: NSApplicator, request: RPC.IWatchCreateRequest);
    /**
     * connecting is fired when we send a request to etcd to queue this watcher.
     */
    on(event: 'connecting', handler: (req: RPC.IWatchRequest) => void): this;
    /**
     * connected is fired after etcd knowledges the watcher is connected.
     * When this event is fired, `id` will already be populated.
     */
    on(event: 'connected', handler: (res: RPC.IWatchResponse) => void): this;
    /**
     * data is fired when etcd reports an update
     * on one of the keys being watched.
     */
    on(event: 'data', handler: (res: RPC.IWatchResponse) => void): this;
    /**
     * put is fired, in addition to `data`, when a key is created
     * or updated in etcd.
     */
    on(event: 'put', handler: (kv: RPC.IKeyValue, previous?: RPC.IKeyValue) => void): this;
    /**
     * put is fired, in addition to `data`, when a key is deleted from etcd.
     */
    on(event: 'delete', handler: (kv: RPC.IKeyValue, previous?: RPC.IKeyValue) => void): this;
    /**
     * end is fired after the watcher is closed normally. Like Node.js streams,
     * end is NOT fired if `error` is fired.
     */
    on(event: 'end', handler: () => void): this;
    /**
     * disconnected is fired if the watcher is disconnected from etcd. The
     * watcher will automatically attempt to reconnect when this occurs. When
     * this event is fired, `id` will still be populated if it was previously.
     */
    on(event: 'disconnected', handler: (res: EtcdError) => void): this;
    /**
     * error is fired if a non-recoverable error occurs that prevents the watcher
     * from functioning. This generally occurs if etcd unexpectedly canceled our
     * lease, which can occur if (for example) we don't have permission to read
     * the watched key or range. When this event is fired, `id` will still be
     * populated if it was previously.
     */
    on(event: 'error', handler: (err: EtcdError) => void): this;
    /**
     * lastRevision returns the latest etcd cluster revision that this
     * watcher observed. This will be `null` if the watcher has not yet
     * connected.
     */
    lastRevision(): number | null;
    /**
     * Cancels the watcher.
     */
    cancel(): Promise<void>;
    /**
     * Updates the current revision based on the revision in the watch header.
     */
    private updateRevision(req);
}
