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
const sinon = require("sinon");
const util_1 = require("./util");
describe('client', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_1.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    it('allows mocking', () => __awaiter(this, void 0, void 0, function* () {
        const mock = client.mock({
            exec: sinon.stub(),
            getConnection: sinon.stub(),
        });
        mock.exec.resolves({ kvs: [] });
        chai_1.expect(yield client.get('foo1').string()).to.be.null;
        chai_1.expect(mock.exec.calledWith('KV', 'range')).to.be.true;
        client.unmock();
        chai_1.expect(yield client.get('foo1').string()).to.equal('bar1');
    }));
});
