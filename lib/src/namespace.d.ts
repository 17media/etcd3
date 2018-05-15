/// <reference types="node" />
import * as grpc from 'grpc';
import * as Builder from './builder';
import { ConnectionPool } from './connection-pool';
import { Lease } from './lease';
import { Lock } from './lock';
import { IOptions } from './options';
import { Rangable, Range } from './range';
import * as RPC from './rpc';
import { ISTMOptions, SoftwareTransaction } from './stm';
import { WatchBuilder } from './watch';
/**
 * Namespace is the class on which CRUD operations can be invoked. The default
 * namespace is the empty string, "". You can create nested namespaces by
 * calling the `namespace(prefix)` method.
 *
 * For example, if the current namespace is the default "" and you call
 * namespace('user1/'), all operations on that new namespace will be
 * automatically prefixed with `user1/`:
 *
 * ```
 * const client = new Etcd3();
 * const ns = client.namespace('user1/');
 *
 * await ns.put('foo').value('bar'); // sets the key `user1/foo` to `bar`
 * await ns.delete().all(); // deletes all keys with the prefix `user1/`
 * ```
 *
 * Namespacing is particularly useful to avoid clashing between multiple
 * applications and when using Etcd's access control.
 */
export declare class Namespace {
    protected readonly prefix: Buffer;
    protected readonly pool: ConnectionPool;
    protected readonly options: IOptions;
    readonly kv: RPC.KVClient;
    readonly leaseClient: RPC.LeaseClient;
    readonly watchClient: RPC.WatchClient;
    private readonly nsApplicator;
    private readonly watchManager;
    protected constructor(prefix: Buffer, pool: ConnectionPool, options: IOptions);
    /**
     * `.get()` starts a query to look up a single key from etcd.
     */
    get(key: string): Builder.SingleRangeBuilder;
    /**
     * `.getAll()` starts a query to look up multiple keys from etcd.
     */
    getAll(): Builder.MultiRangeBuilder;
    /**
     * `.put()` starts making a put request against etcd.
     */
    put(key: string | Buffer): Builder.PutBuilder;
    /**
     * `.delete()` starts making a delete request against etcd.
     */
    delete(): Builder.DeleteBuilder;
    /**
     * `lease()` grants and returns a new Lease instance. The Lease is
     * automatically kept alive for you until it is revoked. See the
     * documentation on the Lease class for some examples.
     */
    lease(ttl: number, options?: grpc.CallOptions): Lease;
    /**
     * `lock()` is a helper to provide distributed locking capability. See
     * the documentation on the Lock class for more information and examples.
     */
    lock(key: string | Buffer): Lock;
    /**
     * `stm()` creates a new software transaction, see more details about how
     * this works and why you might find this useful
     * on the SoftwareTransaction class.
     */
    stm(options?: Partial<ISTMOptions>): SoftwareTransaction;
    /**
     * `if()` starts a new etcd transaction, which allows you to execute complex
     * statements atomically. See documentation on the ComparatorBuilder for
     * more information.
     */
    if(key: string | Buffer, column: keyof typeof Builder.compareTarget, cmp: keyof typeof Builder.comparator, value: string | Buffer | number): Builder.ComparatorBuilder;
    /**
     * `.watch()` creates a new watch builder. See the documentation on the
     * WatchBuilder for usage examples.
     */
    watch(): WatchBuilder;
    /**
     * Creates a structure representing an etcd range. Used in permission grants
     * and queries. This is a convenience method for `Etcd3.Range.from(...)`.
     */
    range(r: Rangable): Range;
    /**
     * namespace adds a prefix and returns a new Namespace, which is used for
     * operating on keys in a prefixed domain. For example, if the current
     * namespace is the default "" and you call namespace('user1/'), all
     * operations on that new namespace will be automatically prefixed
     * with `user1/`. See the Namespace class for more details.
     */
    namespace(prefix: string | Buffer): Namespace;
}
