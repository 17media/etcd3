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
const util_1 = require("./util");
describe('namespacing', () => {
    let client;
    let ns;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        client = yield util_1.createTestClientAndKeys();
        ns = client.namespace('user1/');
    }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    const assertEqualInNamespace = (key, value) => __awaiter(this, void 0, void 0, function* () {
        chai_1.expect(yield ns.get(key)).to.equal(value);
        chai_1.expect(yield client.get(`user1/${key}`)).to.equal(value);
    });
    it('puts and gets values in the namespace', () => __awaiter(this, void 0, void 0, function* () {
        yield ns.put('foo').value('');
        yield assertEqualInNamespace('foo', '');
        chai_1.expect(yield ns.getAll().strings()).to.deep.equal({ foo: '' });
    }));
    it('deletes values in the namespace', () => __awaiter(this, void 0, void 0, function* () {
        yield ns.put('foo1').value('');
        yield ns.put('foo2').value('');
        yield ns.delete().key('foo1');
        chai_1.expect(yield ns.getAll().strings()).to.deep.equal({ foo2: '' });
        yield ns.delete().all();
        chai_1.expect(yield ns.getAll().strings()).to.deep.equal({});
        chai_1.expect(yield client.getAll().keys()).to.have.length.greaterThan(0);
    }));
    it('contains leases in the namespace', () => __awaiter(this, void 0, void 0, function* () {
        const lease = ns.lease(100);
        yield lease.put('leased').value('');
        yield assertEqualInNamespace('leased', '');
        yield lease.revoke();
    }));
    it('contains locks in the namespace', () => __awaiter(this, void 0, void 0, function* () {
        const lock = ns.lock('mylock');
        yield lock.acquire();
        chai_1.expect(yield ns.get('mylock')).to.not.be.null;
        chai_1.expect(yield client.get('user1/mylock')).to.not.be.null;
        yield lock.release();
    }));
    it('runs a simple if', () => __awaiter(this, void 0, void 0, function* () {
        yield ns.put('foo1').value('potatoes');
        yield ns
            .if('foo1', 'Value', '==', 'potatoes')
            .then(ns.put('foo1').value('tomatoes'))
            .commit();
        yield assertEqualInNamespace('foo1', 'tomatoes');
    }));
});
