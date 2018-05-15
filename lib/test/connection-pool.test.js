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
const connection_pool_1 = require("../src/connection-pool");
const util_1 = require("./util");
function getOptionsWithBadHost(options = {}) {
    return util_1.getOptions(Object.assign({ hosts: ['127.0.0.1:1', util_1.getHost()] }, options));
}
describe('connection pool', () => {
    const key = Buffer.from('foo');
    const value = Buffer.from('bar');
    let pool;
    afterEach(() => {
        if (pool) {
            pool.close();
            pool = null;
        }
    });
    it('calls simple methods', () => __awaiter(this, void 0, void 0, function* () {
        pool = new connection_pool_1.ConnectionPool(util_1.getOptions());
        const kv = new src_1.KVClient(pool);
        yield kv.put({ key, value });
        const res = yield kv.range({ key });
        chai_1.expect(res.kvs).to.containSubset([{ key, value }]);
        yield kv.deleteRange({ key });
    }));
    it('rejects instantiating with a mix of secure and unsecure hosts', () => {
        chai_1.expect(() => new connection_pool_1.ConnectionPool(util_1.getOptions({
            hosts: ['https://server1', 'http://server2'],
            credentials: undefined,
        }))).to.throw(/mix of secure and insecure hosts/);
    });
    it('rejects hitting invalid hosts', () => {
        pool = new connection_pool_1.ConnectionPool(getOptionsWithBadHost());
        const kv = new src_1.KVClient(pool);
        return kv
            .range({ key })
            .then(() => {
            throw new Error('expected to reject');
        })
            .catch(err => chai_1.expect(err).to.be.an.instanceof(src_1.GRPCConnectFailedError));
    });
    it('retries when requested', () => __awaiter(this, void 0, void 0, function* () {
        pool = new connection_pool_1.ConnectionPool(getOptionsWithBadHost({ retry: true }));
        const kv = new src_1.KVClient(pool);
        chai_1.expect((yield kv.range({ key })).kvs).to.deep.equal([]);
    }));
});
