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
describe('transactions', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_1.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    it('runs a simple if', () => __awaiter(this, void 0, void 0, function* () {
        yield client
            .if('foo1', 'Value', '==', 'bar1')
            .then(client.put('foo1').value('bar2'))
            .commit();
        chai_1.expect(yield client.get('foo1').string()).to.equal('bar2');
    }));
    it('runs consequents', () => __awaiter(this, void 0, void 0, function* () {
        yield client
            .if('foo1', 'Value', '==', 'bar1')
            .then(client.put('foo1').value('bar2'))
            .else(client.put('foo1').value('bar3'))
            .commit();
        chai_1.expect(yield client.get('foo1').string()).to.equal('bar2');
    }));
    it('runs multiple clauses and consequents', () => __awaiter(this, void 0, void 0, function* () {
        const result = yield client
            .if('foo1', 'Value', '==', 'bar1')
            .and('foo2', 'Value', '==', 'wut')
            .then(client.put('foo1').value('bar2'))
            .else(client.put('foo1').value('bar3'), client.get('foo2'))
            .commit();
        chai_1.expect(result.responses[1].response_range.kvs[0].value.toString()).to.equal('bar2');
        chai_1.expect(yield client.get('foo1').string()).to.equal('bar3');
    }));
});
