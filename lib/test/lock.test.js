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
describe('lock()', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_1.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    const assertCantLock = () => {
        return chai_1.expect(client.lock('resource').acquire()).to.eventually.be.rejectedWith(src_1.EtcdLockFailedError);
    };
    const assertAbleToLock = () => __awaiter(this, void 0, void 0, function* () {
        const lock = client.lock('resource');
        yield lock.acquire();
        yield lock.release();
    });
    it('locks exclusively around a resource', () => __awaiter(this, void 0, void 0, function* () {
        const lock1 = client.lock('resource');
        yield lock1.acquire();
        yield assertCantLock();
        yield lock1.release();
        yield assertAbleToLock();
    }));
    it('provides locking around functions', () => __awaiter(this, void 0, void 0, function* () {
        yield client.lock('resource').do(assertCantLock);
        yield assertAbleToLock();
    }));
    it('allows setting lock TTL before acquiring', () => __awaiter(this, void 0, void 0, function* () {
        const lock = yield client
            .lock('resource')
            .ttl(10)
            .acquire();
        yield lock.release();
    }));
    it('disallows setting TTL while lock is acquired', () => __awaiter(this, void 0, void 0, function* () {
        const lock = yield client.lock('resource').acquire();
        chai_1.expect(() => lock.ttl(10)).to.throw(/Cannot set a lock TTL after acquiring the lock/);
        yield lock.release();
    }));
});
