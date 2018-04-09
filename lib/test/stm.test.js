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
const chai_1 = require("chai");
const src_1 = require("../src");
const util_1 = require("./util");
describe('stm()', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_1.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    it('executes empty transactions', () => __awaiter(this, void 0, void 0, function* () {
        chai_1.expect(yield client.stm().transact(() => 'foo')).to.equal('foo');
    }));
    const expectRetry = (isolation, fn, retries = 2) => __awaiter(this, void 0, void 0, function* () {
        let tries = 0;
        yield client.stm({ isolation }).transact((tx) => __awaiter(this, void 0, void 0, function* () { return fn(tx, ++tries); }));
        chai_1.expect(tries).to.equal(retries);
    });
    const expectRunsCleanTransaction = (isolation) => {
        it('runs transactions when all is good', () => __awaiter(this, void 0, void 0, function* () {
            yield client.stm({ isolation }).transact((tx) => __awaiter(this, void 0, void 0, function* () {
                const value = yield tx.get('foo1');
                yield tx.put('foo1').value(value.repeat(3));
                chai_1.expect(yield client.get('foo1')).to.equal('bar1'); // should not have changed yet
            }));
            chai_1.expect(yield client.get('foo1')).to.equal('bar1bar1bar1');
        }));
    };
    const expectRepeatableReads = (isolation) => {
        it('has repeatable reads on existing keys', () => __awaiter(this, void 0, void 0, function* () {
            yield expectRetry(isolation, (tx, tries) => __awaiter(this, void 0, void 0, function* () {
                yield tx.get('foo1');
                if (tries === 1) {
                    // should fail when the key changes before the transaction commits
                    yield client.put('foo1').value('lol');
                }
            }));
        }));
        it('has repeatable reads on non-existent', () => __awaiter(this, void 0, void 0, function* () {
            yield expectRetry(isolation, (tx, tries) => __awaiter(this, void 0, void 0, function* () {
                yield tx.get('some-key-that-does-not-exist');
                if (tries === 1) {
                    yield client.put('some-key-that-does-not-exist').value('lol');
                }
            }));
        }));
    };
    const ignoreConflicts = (isolation, fn) => {
        return client
            .stm({ retries: 0, isolation })
            .transact(fn)
            .catch(err => {
            if (!(err instanceof src_1.STMConflictError)) {
                throw err;
            }
        });
    };
    const expectWriteCaching = (isolation) => {
        it('caches writes in memory (#1)', () => {
            return ignoreConflicts(isolation, (tx) => __awaiter(this, void 0, void 0, function* () {
                // putting and value and getting it should returned the value to be written
                yield tx.put('foo').value('some value');
                chai_1.expect(yield tx.get('foo').string()).to.equal('some value');
            }));
        });
        it('caches writes in memory (#2)', () => __awaiter(this, void 0, void 0, function* () {
            return ignoreConflicts(isolation, (tx) => __awaiter(this, void 0, void 0, function* () {
                // getting a value, then overwriting it, should return the overwritten value
                chai_1.expect(yield tx.get('foo1').string()).to.equal('bar1');
                yield tx.put('foo1').value('lol');
                chai_1.expect(yield tx.get('foo1').string()).to.equal('lol');
            }));
        }));
        it('caches writes in memory (#3)', () => __awaiter(this, void 0, void 0, function* () {
            return ignoreConflicts(isolation, (tx) => __awaiter(this, void 0, void 0, function* () {
                // deleting a value should null it
                yield tx.delete().key('foo1');
                chai_1.expect(yield tx.get('foo1').string()).to.be.null;
                // subsequently writing a key should put it back
                yield tx.put('foo1').value('lol');
                chai_1.expect(yield tx.get('foo1').string()).to.equal('lol');
            }));
        }));
        it('caches writes in memory (#4)', () => __awaiter(this, void 0, void 0, function* () {
            return ignoreConflicts(isolation, (tx) => __awaiter(this, void 0, void 0, function* () {
                // deleting a range should null all keys in that range
                yield tx.delete().prefix('foo');
                chai_1.expect(yield tx.get('foo2').string()).to.be.null;
            }));
        }));
    };
    const expectReadCaching = (isolation) => {
        it('caches reads in memory', () => __awaiter(this, void 0, void 0, function* () {
            return client
                .stm({ retries: 0, isolation })
                .transact((tx) => __awaiter(this, void 0, void 0, function* () {
                chai_1.expect(yield tx.get('foo1').string()).to.equal('bar1');
                yield client.put('foo1').value('changed!');
                chai_1.expect(yield tx.get('foo1').string()).to.equal('bar1');
            }))
                .catch(() => undefined);
        }));
    };
    describe('ReadCommitted', () => {
        expectWriteCaching(3 /* ReadCommitted */);
        expectRunsCleanTransaction(3 /* ReadCommitted */);
    });
    describe('RepeatableReads', () => {
        expectWriteCaching(2 /* RepeatableReads */);
        expectRunsCleanTransaction(2 /* RepeatableReads */);
        expectRepeatableReads(2 /* RepeatableReads */);
    });
    describe('Serializable', () => {
        expectWriteCaching(1 /* Serializable */);
        expectRunsCleanTransaction(1 /* Serializable */);
        expectRepeatableReads(1 /* Serializable */);
        expectReadCaching(1 /* Serializable */);
    });
    describe('SerializableSnapshot', () => {
        expectWriteCaching(0 /* SerializableSnapshot */);
        expectRunsCleanTransaction(0 /* SerializableSnapshot */);
        expectRepeatableReads(0 /* SerializableSnapshot */);
        expectReadCaching(0 /* SerializableSnapshot */);
        it('should deny writing ranges if keys are read', () => {
            return chai_1.expect(ignoreConflicts(0 /* SerializableSnapshot */, (tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.get('foo1').string();
                yield tx.delete().prefix('foo');
            }))).to.eventually.be.rejectedWith(/You cannot delete ranges/);
        });
        // the blueprint for the next two is:
        // 1. get foo1
        // 2. outside the transaction, set it to something else
        // 3. try to writed/delete it and fail
        // 4. get foo1, this time write it succesfully to what was set before
        it('retries writes on conflicts', () => __awaiter(this, void 0, void 0, function* () {
            yield expectRetry(0 /* SerializableSnapshot */, (tx, tries) => __awaiter(this, void 0, void 0, function* () {
                const value = yield tx.get('foo1');
                if (tries === 1) {
                    yield client.put('foo1').value('lol');
                }
                yield tx.put('foo1').value(value.repeat(3));
            }));
            chai_1.expect(yield client.get('foo1')).to.equal('lollollol');
        }));
        it('retries deletes on conflicts', () => __awaiter(this, void 0, void 0, function* () {
            yield expectRetry(0 /* SerializableSnapshot */, (tx, tries) => __awaiter(this, void 0, void 0, function* () {
                yield tx.get('foo1');
                if (tries === 1) {
                    yield client.put('foo1').value('lol');
                }
                yield tx.delete().key('foo1');
            }));
            chai_1.expect(yield client.get('foo1')).to.null;
        }));
        it('aborts transactions on continous failure', () => __awaiter(this, void 0, void 0, function* () {
            yield chai_1.expect(client
                .stm({ isolation: 0 /* SerializableSnapshot */ })
                .transact((tx) => __awaiter(this, void 0, void 0, function* () {
                const value = yield tx.get('foo1');
                yield client.put('foo1').value('lol');
                yield tx.put('foo1').value(value.repeat(3));
            }))
                .then(() => {
                throw new Error('expected to throw');
            })).to.eventually.be.rejectedWith(src_1.STMConflictError);
        }));
    });
});
