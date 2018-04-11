"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = require("bignumber.js");
const EventEmitter = require("events");
const errors_1 = require("./errors");
/**
 * Implmentation of etcd election.
 * @see https://github.com/coreos/etcd/blob/master/clientv3/concurrency/election.go
 *
 * @example
 * const client = new Etcd3()
 * const election = new Election(client, 'singleton_service')
 * const id = BigNumber.random().toString()
 *
 * // process will hang here until elected
 * await election.campaign(id)
 */
class Election extends EventEmitter {
    constructor(parent, name, ttl = 60) {
        super();
        this.parent = parent;
        this.name = name;
        this.ttl = ttl;
        this.leaseId = '';
        this._leaderKey = '';
        this._leaderRevision = '';
        this._isCampaigning = false;
        this._isObserving = false;
        this.namespace = parent.namespace(this.getPrefix());
        this.lease = this.namespace.lease(ttl);
        this.lease.on('lost', error => this.emit('error', error));
    }
    get leaderKey() { return this._leaderKey; }
    get leaderRevision() { return this._leaderRevision; }
    get isReady() { return this.leaseId.length > 0; }
    get isCampaigning() { return this._isCampaigning; }
    get isObserving() { return this._isObserving; }
    on(event, listener) {
        super.on(event, listener);
        if (this.shouldObserve(event)) {
            this.tryObserve();
        }
        return this;
    }
    /* istanbul ignore next */
    addListener(event, listener) {
        return this.on(event, listener);
    }
    /* istanbul ignore next */
    once(event, listener) {
        super.once(event, listener);
        if (this.shouldObserve(event)) {
            this.tryObserve();
        }
        return this;
    }
    ready() {
        return __awaiter(this, void 0, void 0, function* () {
            const leaseId = yield this.lease.grant();
            if (!this.isReady) {
                this.leaseId = leaseId;
            }
        });
    }
    campaign(value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ready();
            const result = yield this.namespace
                .if(this.leaseId, 'Create', '==', 0)
                .then(this.namespace.put(this.leaseId).value(value).lease(this.leaseId))
                .else(this.namespace.get(this.leaseId))
                .commit();
            this._leaderKey = `${this.getPrefix()}${this.leaseId}`;
            this._leaderRevision = result.header.revision;
            this._isCampaigning = true;
            if (!result.succeeded) {
                try {
                    const kv = result.responses[0].response_range.kvs[0];
                    this._leaderRevision = kv.create_revision;
                    if (kv.value.toString() !== value) {
                        yield this.proclaim(value);
                    }
                }
                catch (error) {
                    yield this.resign();
                    throw error;
                }
            }
            try {
                yield this.waitForElected();
            }
            catch (error) {
                yield this.resign();
                throw error;
            }
        });
    }
    proclaim(value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._isCampaigning) {
                throw new errors_1.EtcdNotLeaderError();
            }
            const r = yield this.namespace
                .if(this.leaseId, 'Create', '==', this._leaderRevision)
                .then(this.namespace.put(this.leaseId).value(value).lease(this.leaseId))
                .commit();
            if (!r.succeeded) {
                this._leaderKey = '';
                throw new errors_1.EtcdNotLeaderError();
            }
        });
    }
    resign() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isCampaigning) {
                return;
            }
            const r = yield this.namespace
                .if(this.leaseId, 'Create', '==', this._leaderRevision)
                .then(this.namespace.delete().key(this.leaseId))
                .commit();
            if (!r.succeeded) {
                // If fail, revoke lease for performing resigning
                yield this.lease.revoke();
                this.leaseId = '';
            }
            this._leaderKey = '';
            this._leaderRevision = '';
            this._isCampaigning = false;
        });
    }
    getLeader() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.namespace.getAll().sort('Create', 'Ascend').keys();
            if (result.length === 0) {
                throw new errors_1.EtcdNoLeaderError();
            }
            return `${this.getPrefix()}${result[0]}`;
        });
    }
    getPrefix() {
        return `${Election.prefix}/${this.name}/`;
    }
    waitForElected() {
        return __awaiter(this, void 0, void 0, function* () {
            // find last create before this
            const lastRevision = new bignumber_js_1.default(this.leaderRevision).minus(1).toString();
            const result = yield this.namespace
                .getAll()
                .maxCreateRevision(lastRevision)
                .sort('Create', 'Descend')
                .keys();
            // no one before this, elected
            if (result.length === 0) {
                return;
            }
            // wait all keys created ealier are deleted
            yield waitForDeletes(this.namespace, result);
        });
    }
    observe() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isObserving) {
                return;
            }
            try {
                this._isObserving = true;
                // looking for current leader
                let leaderKey = '';
                const result = yield this.namespace.getAll().sort('Create', 'Ascend').keys();
                if (result.length === 0) {
                    // if not found, wait for leader
                    const watcher = yield this.parent.watch().prefix(this.getPrefix()).create();
                    try {
                        leaderKey = yield new Promise((resolve, reject) => {
                            watcher.on('put', kv => resolve(kv.key.toString()));
                            watcher.on('error', reject);
                        });
                    }
                    finally {
                        yield watcher.cancel();
                    }
                }
                else {
                    leaderKey = `${this.getPrefix()}${result[0]}`;
                }
                // emit current leader
                this.emit('leader', leaderKey);
                // wait for delete event
                yield waitForDelete(this.parent, leaderKey);
            }
            finally {
                this._isObserving = false;
            }
            // only keep watch if listened
            if (this.listenerCount('leader') > 0) {
                this.tryObserve();
            }
        });
    }
    tryObserve() {
        this.observe().catch(error => {
            if (this.listenerCount('error') > 0) {
                this.emit('error', error);
            }
            else {
                throw error;
            }
        });
    }
    shouldObserve(event) {
        switch (event) {
            case 'leader': return true;
            default: return false;
        }
    }
}
Election.prefix = 'election';
exports.Election = Election;
function waitForDelete(namespace, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const watcher = yield namespace.watch().key(key).create();
        const deleteOrError = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            // waiting for deleting of that key
            watcher.on('delete', resolve);
            watcher.on('error', reject);
        }));
        try {
            yield deleteOrError;
        }
        finally {
            yield watcher.cancel();
        }
    });
}
function waitForDeletes(namespace, keys) {
    return __awaiter(this, void 0, void 0, function* () {
        if (keys.length === 0) {
            return;
        }
        else if (keys.length === 1) {
            return waitForDelete(namespace, keys[0]);
        }
        const tasks = keys.map(key => () => __awaiter(this, void 0, void 0, function* () {
            const keyExisted = (yield namespace.get(key).string()) !== null;
            if (!keyExisted) {
                return;
            }
            yield waitForDelete(namespace, key);
        }));
        let task = tasks.shift();
        while (task) {
            yield task();
            task = tasks.shift();
        }
    });
}
