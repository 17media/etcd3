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
const src_1 = require("../src");
const util_1 = require("../src/util");
const util_2 = require("./util");
describe('lease()', () => {
    let client;
    let lease;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_2.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_2.tearDownTestClient(client); }));
    const watchEmission = (event) => {
        const output = { data: null, fired: false };
        lease.once(event, (data) => {
            output.data = data;
            output.fired = true;
        });
        return output;
    };
    afterEach(() => __awaiter(this, void 0, void 0, function* () {
        if (lease && !lease.revoked()) {
            yield lease.revoke();
        }
    }));
    it('throws if trying to use too short of a ttl, or an undefined ttl', () => {
        chai_1.expect(() => client.lease(0)).to.throw(/must be at least 1 second/);
        chai_1.expect(() => client.lease()).to.throw(/must be at least 1 second/);
    });
    it('reports a loss and errors if the client is invalid', () => __awaiter(this, void 0, void 0, function* () {
        const badClient = new src_1.Etcd3(util_2.getOptions({ hosts: '127.0.0.1:1' }));
        lease = badClient.lease(1);
        const err = yield util_1.onceEvent(lease, 'lost');
        chai_1.expect(err).to.be.an.instanceof(src_1.GRPCConnectFailedError);
        yield lease
            .grant()
            .then(() => {
            throw new Error('expected to reject');
        })
            .catch(err2 => chai_1.expect(err2).to.equal(err));
        badClient.close();
    }));
    it('provides basic lease lifecycle', () => __awaiter(this, void 0, void 0, function* () {
        lease = client.lease(100);
        yield lease.put('leased').value('foo');
        chai_1.expect((yield client.get('leased').exec()).kvs[0].lease).to.equal(yield lease.grant());
        yield lease.revoke();
        chai_1.expect(yield client.get('leased').buffer()).to.be.null;
    }));
    it('runs immediate keepalives', () => __awaiter(this, void 0, void 0, function* () {
        lease = client.lease(100);
        chai_1.expect(yield lease.keepaliveOnce()).to.containSubset({
            ID: yield lease.grant(),
            TTL: '100',
        });
        yield lease.keepaliveOnce();
    }));
    it('is resilient to network interruptions', () => __awaiter(this, void 0, void 0, function* () {
        yield util_2.proxy.activate();
        const proxiedClient = new src_1.Etcd3(util_2.getOptions());
        lease = proxiedClient.lease(100);
        yield lease.grant();
        util_2.proxy.pause();
        yield util_1.onceEvent(lease, 'keepaliveFailed');
        util_2.proxy.resume();
        yield util_1.onceEvent(lease, 'keepaliveSucceeded');
        yield lease.revoke();
        proxiedClient.close();
        util_2.proxy.deactivate();
    }));
    it('marks leases as failed if the server is not contacted for a while', () => __awaiter(this, void 0, void 0, function* () {
        yield util_2.proxy.activate();
        const proxiedClient = new src_1.Etcd3(util_2.getOptions());
        lease = proxiedClient.lease(1);
        yield lease.grant();
        util_2.proxy.pause();
        lease.lastKeepAlive = Date.now() - 2000; // speed things up a little
        const err = yield util_1.onceEvent(lease, 'lost');
        chai_1.expect(err.message).to.match(/our lease has expired/);
        proxiedClient.close();
        util_2.proxy.deactivate();
    }));
    it('emits a lost event if the lease is invalidated', () => __awaiter(this, void 0, void 0, function* () {
        lease = client.lease(100);
        let err;
        lease.on('lost', e => {
            chai_1.expect(lease.revoked()).to.be.true;
            err = e;
        });
        chai_1.expect(lease.revoked()).to.be.false;
        yield client.leaseClient.leaseRevoke({ ID: yield lease.grant() });
        yield lease
            .keepaliveOnce()
            .then(() => {
            throw new Error('expected to reject');
        })
            .catch(err2 => {
            chai_1.expect(err2).to.equal(err);
            chai_1.expect(err2).to.be.an.instanceof(src_1.EtcdLeaseInvalidError);
            chai_1.expect(lease.revoked()).to.be.true;
        });
    }));
    it('emits a loss if the touched key is lost', () => __awaiter(this, void 0, void 0, function* () {
        lease.leaseID = Promise.resolve('123456789');
        const lost = util_1.onceEvent(lease, 'lost');
        try {
            yield lease.put('foo').value('bar');
        }
        catch (e) {
            chai_1.expect(e).to.be.an.instanceof(src_1.EtcdLeaseInvalidError);
            chai_1.expect(e).to.equal(yield lost);
            chai_1.expect(lease.revoked()).to.be.true;
        }
    }));
    describe('crons', () => {
        let clock;
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            clock = sinon.useFakeTimers();
            lease = client.lease(60);
            yield util_1.onceEvent(lease, 'keepaliveEstablished');
        }));
        afterEach(() => clock.restore());
        it('touches the lease ttl at the correct interval', () => __awaiter(this, void 0, void 0, function* () {
            const kaFired = watchEmission('keepaliveFired');
            clock.tick(19999);
            chai_1.expect(kaFired.fired).to.be.false;
            clock.tick(1);
            chai_1.expect(kaFired.fired).to.be.true;
            const res = yield util_1.onceEvent(lease, 'keepaliveSucceeded');
            chai_1.expect(res.TTL).to.equal('60');
        }));
        it('stops touching the lease if released passively', () => __awaiter(this, void 0, void 0, function* () {
            const kaFired = watchEmission('keepaliveFired');
            lease.release();
            clock.tick(20000);
            chai_1.expect(kaFired.fired).to.be.false;
        }));
        it('tears down if the lease gets revoked', () => __awaiter(this, void 0, void 0, function* () {
            yield client.leaseClient.leaseRevoke({ ID: yield lease.grant() });
            clock.tick(20000);
            chai_1.expect(yield util_1.onceEvent(lease, 'lost')).to.be.an.instanceof(src_1.EtcdLeaseInvalidError);
            chai_1.expect(lease.revoked()).to.be.true;
        }));
    });
});
