"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Builder = require("./builder");
const connection_pool_1 = require("./connection-pool");
const lease_1 = require("./lease");
const lock_1 = require("./lock");
const range_1 = require("./range");
const RPC = require("./rpc");
const stm_1 = require("./stm");
const util_1 = require("./util");
const watch_1 = require("./watch");
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
class Namespace {
    constructor(prefix, pool, options) {
        this.prefix = prefix;
        this.pool = pool;
        this.options = options;
        this.kv = new RPC.KVClient(this.pool);
        this.leaseClient = new RPC.LeaseClient(this.pool);
        this.watchClient = new RPC.WatchClient(this.pool);
        this.nsApplicator = new util_1.NSApplicator(this.prefix);
        this.watchManager = new watch_1.WatchManager(this.watchClient, this.options.backoffStrategy || connection_pool_1.defaultBackoffStrategy);
    }
    /**
     * `.get()` starts a query to look up a single key from etcd.
     */
    get(key) {
        return new Builder.SingleRangeBuilder(this.kv, this.nsApplicator, key);
    }
    /**
     * `.getAll()` starts a query to look up multiple keys from etcd.
     */
    getAll() {
        return new Builder.MultiRangeBuilder(this.kv, this.nsApplicator);
    }
    /**
     * `.put()` starts making a put request against etcd.
     */
    put(key) {
        return new Builder.PutBuilder(this.kv, this.nsApplicator, key);
    }
    /**
     * `.delete()` starts making a delete request against etcd.
     */
    delete() {
        return new Builder.DeleteBuilder(this.kv, this.nsApplicator);
    }
    /**
     * `lease()` grants and returns a new Lease instance. The Lease is
     * automatically kept alive for you until it is revoked. See the
     * documentation on the Lease class for some examples.
     */
    lease(ttl, options) {
        return new lease_1.Lease(this.pool, this.nsApplicator, ttl, options);
    }
    /**
     * `lock()` is a helper to provide distributed locking capability. See
     * the documentation on the Lock class for more information and examples.
     */
    lock(key) {
        return new lock_1.Lock(this.pool, this.nsApplicator, key);
    }
    /**
     * `stm()` creates a new software transaction, see more details about how
     * this works and why you might find this useful
     * on the SoftwareTransaction class.
     */
    stm(options) {
        return new stm_1.SoftwareTransaction(Object.assign({ isolation: 0 /* SerializableSnapshot */, prefetch: [], retries: 3 }, options), this.nsApplicator, this.kv);
    }
    /**
     * `if()` starts a new etcd transaction, which allows you to execute complex
     * statements atomically. See documentation on the ComparatorBuilder for
     * more information.
     */
    if(key, column, cmp, value) {
        return new Builder.ComparatorBuilder(this.kv, this.nsApplicator).and(key, column, cmp, value);
    }
    /**
     * `.watch()` creates a new watch builder. See the documentation on the
     * WatchBuilder for usage examples.
     */
    watch() {
        return new watch_1.WatchBuilder(this.watchManager, this.nsApplicator);
    }
    /**
     * Creates a structure representing an etcd range. Used in permission grants
     * and queries. This is a convenience method for `Etcd3.Range.from(...)`.
     */
    range(r) {
        return range_1.Range.from(r);
    }
    /**
     * namespace adds a prefix and returns a new Namespace, which is used for
     * operating on keys in a prefixed domain. For example, if the current
     * namespace is the default "" and you call namespace('user1/'), all
     * operations on that new namespace will be automatically prefixed
     * with `user1/`. See the Namespace class for more details.
     */
    namespace(prefix) {
        return new Namespace(Buffer.concat([this.prefix, util_1.toBuffer(prefix)]), this.pool, this.options);
    }
}
exports.Namespace = Namespace;
