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
const exponential_1 = require("../src/backoff/exponential");
const shared_pool_1 = require("../src/shared-pool");
describe('shared pool', () => {
    let pool;
    let clock;
    beforeEach(() => {
        clock = sinon.useFakeTimers(10);
        pool = new shared_pool_1.SharedPool(new exponential_1.ExponentialBackoff({
            initial: 500,
            max: 5000,
            random: 0,
        }));
        pool.add(0);
        pool.add(1);
        pool.add(2);
    });
    afterEach(() => clock.restore());
    function getAll(count = 3) {
        return __awaiter(this, void 0, void 0, function* () {
            const output = [];
            for (let i = 0; i < count; i += 1) {
                clock.tick(1);
                output.push(yield pool.pull());
            }
            return output;
        });
    }
    it('should get available clients', () => __awaiter(this, void 0, void 0, function* () {
        chai_1.expect(yield getAll()).to.deep.equal([0, 1, 2]);
    }));
    it('should exclude clients after failing', () => __awaiter(this, void 0, void 0, function* () {
        pool.fail(0);
        chai_1.expect(yield getAll()).to.deep.equal([1, 2, 1]);
    }));
    it('should add clients back and continue backing off', () => __awaiter(this, void 0, void 0, function* () {
        pool.fail(0);
        chai_1.expect(yield getAll()).to.deep.equal([1, 2, 1]);
        clock.tick(500);
        chai_1.expect(yield getAll()).to.deep.equal([0, 2, 1]);
        pool.fail(0);
        clock.tick(500);
        chai_1.expect(yield getAll()).to.deep.equal([2, 1, 2]);
        clock.tick(500);
        chai_1.expect(yield getAll()).to.deep.equal([0, 1, 2]);
    }));
    it('should add clients back and reset if they succeed', () => __awaiter(this, void 0, void 0, function* () {
        pool.fail(0);
        chai_1.expect(yield getAll()).to.deep.equal([1, 2, 1]);
        clock.tick(500);
        chai_1.expect(yield getAll()).to.deep.equal([0, 2, 1]);
        pool.succeed(0);
        pool.fail(0);
        clock.tick(500);
        chai_1.expect(yield getAll()).to.deep.equal([0, 2, 1]);
    }));
    it('should not back off multiple times if multiple callers fail', () => __awaiter(this, void 0, void 0, function* () {
        const getFirstBackoff = () => pool.resources[0].availableAfter;
        const cnx = yield pool.pull();
        pool.fail(cnx);
        chai_1.expect(getFirstBackoff()).to.equal(Date.now() + 500);
        pool.fail(cnx);
        chai_1.expect(getFirstBackoff()).to.equal(Date.now() + 500);
    }));
});
