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
const chai_1 = require("chai");
const src_1 = require("../src");
const util_1 = require("../src/util");
const util_2 = require("./util");
describe('watch()', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        client = new src_1.Etcd3(util_2.getOptions());
    }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () {
        yield util_2.tearDownTestClient(client);
    }));
    /**
     * Returns the list of watchers currently attached and listening.
     */
    function getWatchers() {
        return client.watchManager.watchers;
    }
    /**
     * Checks that the watcher is getting updates for the given key.
     */
    function expectWatching(watcher, key) {
        return Promise.all([
            client.put(key).value('updated!'),
            util_1.onceEvent(watcher, 'put').then((res) => {
                chai_1.expect(res.key.toString()).to.equal(key);
                chai_1.expect(res.value.toString()).to.equal('updated!');
            }),
        ]).then(() => watcher);
    }
    /**
     * Checks that the watcher is not getting updates for the given key.
     */
    function expectNotWatching(watcher, key) {
        return __awaiter(this, void 0, void 0, function* () {
            let watching = false;
            const listener = () => (watching = true);
            watcher.on('put', listener);
            yield client.put(key).value('updated!');
            return new Promise(resolve => {
                setTimeout(() => {
                    chai_1.expect(watching).to.equal(false, `expected not to be watching ${key}`);
                    resolve(watcher);
                }, 200);
            });
        });
    }
    describe('network interruptions', () => {
        it.skip('is resilient to network interruptions', () => __awaiter(this, void 0, void 0, function* () {
            yield util_2.proxy.activate();
            const proxiedClient = yield util_2.createTestClientAndKeys();
            const watcher = yield proxiedClient
                .watch()
                .key('foo1')
                .create();
            util_2.proxy.pause();
            yield util_1.onceEvent(watcher, 'disconnected');
            util_2.proxy.resume();
            yield util_1.onceEvent(watcher, 'connected');
            yield expectWatching(watcher, 'foo1');
            proxiedClient.close();
            util_2.proxy.deactivate();
        }));
        // todo(connor4312): this is disabled pending resolution on:
        // https://github.com/grpc/grpc-node/issues/80
        it.skip('replays historical updates', () => __awaiter(this, void 0, void 0, function* () {
            yield util_2.proxy.activate();
            const proxiedClient = yield util_2.createTestClientAndKeys();
            const watcher = yield proxiedClient
                .watch()
                .key('foo1')
                .create();
            yield Promise.all([
                client.put('foo1').value('update 1'),
                util_1.onceEvent(watcher, 'data').then((res) => {
                    chai_1.expect(watcher.request.start_revision).to.equal(new bignumber_js_1.default(res.header.revision).add(1).toString());
                }),
            ]);
            util_2.proxy.pause();
            yield util_1.onceEvent(watcher, 'disconnected');
            util_2.proxy.resume();
            yield util_1.onceEvent(watcher, 'put').then((res) => {
                chai_1.expect(res.key.toString()).to.equal('foo1');
                chai_1.expect(res.value.toString()).to.equal('update 2');
            });
            proxiedClient.close();
            util_2.proxy.deactivate();
        }));
        it('caps watchers revisions', () => __awaiter(this, void 0, void 0, function* () {
            yield util_2.proxy.activate();
            const proxiedClient = yield util_2.createTestClientAndKeys();
            const watcher = yield proxiedClient
                .watch()
                .key('foo1')
                .create();
            util_2.proxy.pause();
            yield util_1.onceEvent(watcher, 'disconnected');
            const actualRevision = Number(watcher.request.start_revision);
            watcher.request.start_revision = 999999;
            util_2.proxy.resume();
            yield util_1.onceEvent(watcher, 'connected');
            chai_1.expect(Number(watcher.request.start_revision)).to.equal(actualRevision);
        }));
    });
    describe('subscription', () => {
        it('subscribes before the connection is established', () => __awaiter(this, void 0, void 0, function* () {
            const watcher = yield client
                .watch()
                .key('foo1')
                .create();
            yield expectWatching(watcher, 'foo1');
            chai_1.expect(getWatchers()).to.deep.equal([watcher]);
        }));
        it('subscribes while the connection is still being established', () => __awaiter(this, void 0, void 0, function* () {
            const watcher1 = client
                .watch()
                .key('foo1')
                .create();
            const watcher2 = client
                .watch()
                .key('bar')
                .create();
            const watchers = yield Promise.all([
                watcher1.then(w => expectWatching(w, 'foo1')),
                watcher2.then(w => expectWatching(w, 'bar')),
            ]);
            chai_1.expect(getWatchers()).to.deep.equal(watchers);
        }));
        it('subscribes in series', () => __awaiter(this, void 0, void 0, function* () {
            const watcher1 = client
                .watch()
                .key('foo1')
                .watcher();
            const watcher2 = client
                .watch()
                .key('bar')
                .watcher();
            const events = [];
            watcher1.on('connecting', () => events.push('connecting1'));
            watcher1.on('connected', () => events.push('connected1'));
            watcher2.on('connecting', () => events.push('connecting2'));
            watcher2.on('connected', () => events.push('connected2'));
            yield util_1.onceEvent(watcher2, 'connected');
            chai_1.expect(events).to.deep.equal(['connecting1', 'connected1', 'connecting2', 'connected2']);
        }));
        it('subscribes after the connection is fully established', () => __awaiter(this, void 0, void 0, function* () {
            const watcher1 = yield client
                .watch()
                .key('foo1')
                .create();
            yield expectWatching(watcher1, 'foo1');
            const watcher2 = yield client
                .watch()
                .key('bar')
                .create();
            yield expectWatching(watcher2, 'bar');
            chai_1.expect(getWatchers()).to.deep.equal([watcher1, watcher2]);
        }));
        it('allows successive resubscription (issue #51)', () => __awaiter(this, void 0, void 0, function* () {
            const watcher1 = yield client
                .watch()
                .key('foo1')
                .create();
            yield expectWatching(watcher1, 'foo1');
            yield watcher1.cancel();
            const watcher2 = yield client
                .watch()
                .key('foo1')
                .create();
            yield expectWatching(watcher2, 'foo1');
            yield watcher2.cancel();
        }));
    });
    describe('unsubscribing', () => {
        it('unsubscribes while the connection is established', () => __awaiter(this, void 0, void 0, function* () {
            const watcher = yield client
                .watch()
                .key('foo1')
                .create();
            yield watcher.cancel();
            yield expectNotWatching(watcher, 'foo1');
            chai_1.expect(getWatchers()).to.deep.equal([]);
        }));
        it('unsubscribes while the connection is being reestablished', () => __awaiter(this, void 0, void 0, function* () {
            yield util_2.proxy.activate();
            const proxiedClient = yield util_2.createTestClientAndKeys();
            const watcher = yield proxiedClient
                .watch()
                .key('foo1')
                .create();
            util_2.proxy.pause();
            yield watcher.cancel();
            util_2.proxy.resume();
            chai_1.expect(getWatchers()).to.deep.equal([]);
            proxiedClient.close();
            util_2.proxy.deactivate();
        }));
    });
});
