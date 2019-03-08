"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./auth");
const connection_pool_1 = require("./connection-pool");
const namespace_1 = require("./namespace");
const RPC = require("./rpc");
__export(require("./auth"));
__export(require("./builder"));
__export(require("./errors"));
__export(require("./lease"));
__export(require("./lock"));
__export(require("./namespace"));
__export(require("./range"));
__export(require("./rpc"));
__export(require("./stm"));
__export(require("./election"));
var watch_1 = require("./watch");
exports.WatchBuilder = watch_1.WatchBuilder;
exports.Watcher = watch_1.Watcher;
/**
 * Etcd3 is a high-level interface for interacting and calling etcd endpoints.
 * It also provides several lower-level clients for directly calling methods.
 *
 * ```
 * const { Etcd3 } = require('etcd3');
 * const client = new Etcd3();
 *
 * await client.put('foo').value('bar');
 * console.log('foo is:', await client.get('foo').string());
 *
 * const keys = await client.getAll().prefix('f').strings();
 * console.log('all keys starting with "f"': keys);
 *
 * await client.delete().all();
 * ```
 */
class Etcd3 extends namespace_1.Namespace {
    constructor(options = { hosts: '127.0.0.1:2379' }) {
        super(Buffer.from([]), new connection_pool_1.ConnectionPool(options), options);
        this.auth = new RPC.AuthClient(this.pool);
        this.maintenance = new RPC.MaintenanceClient(this.pool);
        this.cluster = new RPC.ClusterClient(this.pool);
    }
    /**
     * Resolves to an array of roles available in etcd.
     */
    getRoles() {
        return this.auth.roleList().then(result => {
            return result.roles.map(role => new auth_1.Role(this.auth, role));
        });
    }
    /**
     * Returns an object to manipulate the role with the provided name.
     */
    role(name) {
        return new auth_1.Role(this.auth, name);
    }
    /**
     * Resolves to an array of users available in etcd.
     */
    getUsers() {
        return this.auth.userList().then(result => {
            return result.users.map(user => new auth_1.User(this.auth, user));
        });
    }
    /**
     * Returns an object to manipulate the user with the provided name.
     */
    user(name) {
        return new auth_1.User(this.auth, name);
    }
    /**
     * `.mock()` allows you to insert an interface that will be called into
     * instead of calling out to the "real" service. `unmock` should be called
     * after mocking is finished.
     *
     * For example:
     *
     * ```
     * const sinon = require('sinon');
     * const { expect } = require('chai');
     *
     * const { Etcd3 } = require('etcd3');
     * const client = new Etcd3();
     *
     * const mock = client.mock({ exec: sinon.stub() });
     * mock.exec.resolves({ kvs: [{ key: 'foo', value: 'bar' }]});
     * const output = client.get('foo').string();
     * expect(output).to.equal('bar');
     * client.unmock();
     * ```
     */
    mock(callable) {
        this.pool.mock(callable);
        return callable;
    }
    /**
     * Removes any previously-inserted mock.
     */
    unmock() {
        this.pool.unmock();
    }
    /**
     * Frees resources associated with the client.
     */
    close() {
        this.pool.close();
    }
}
exports.Etcd3 = Etcd3;
