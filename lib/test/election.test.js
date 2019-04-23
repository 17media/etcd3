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
const util_1 = require("./util");
const sleep = (t) => new Promise(resolve => setTimeout(resolve, t));
describe('election', () => {
    let client;
    let election;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        client = new src_1.Etcd3(util_1.getOptions());
        election = new src_1.Election(client, 'test-election', 1);
        yield election.campaign('candidate');
    }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () {
        election.removeAllListeners();
        yield election.resign();
        yield util_1.tearDownTestClient(client);
    }));
    describe('campaign', () => {
        it('should wait for elected in campaign', () => __awaiter(this, void 0, void 0, function* () {
            const client2 = new src_1.Etcd3(util_1.getOptions());
            const election2 = new src_1.Election(client2, 'test-election', 1);
            const client3 = new src_1.Etcd3(util_1.getOptions());
            const election3 = new src_1.Election(client3, 'test-election', 1);
            /**
             * phase 0: client elected
             * phase 1: client resigned, client2 elected
             * phase 2: client2 resigned, client3 elected
             */
            let phase = 0;
            const waitElection2 = election2.campaign('candidate2')
                .then(() => election.getLeader())
                .then(currentLeaderKey => {
                chai_1.expect(phase).to.equal(1);
                chai_1.expect(currentLeaderKey).to.equal(election2.leaderKey);
            });
            // essure client2 has joined campaign before client3
            yield sleep(100);
            const waitElection3 = election3.campaign('candidate3')
                .then(() => election.getLeader())
                .then(currentLeaderKey => {
                chai_1.expect(phase).to.equal(2);
                chai_1.expect(currentLeaderKey).to.equal(election3.leaderKey);
            });
            // ensure client3 joined campaign
            yield sleep(100);
            phase = 1;
            yield election.resign();
            // ensure client2 and client3 watcher triggered
            yield sleep(100);
            phase = 2;
            yield election2.resign();
            yield sleep(100);
            yield election3.resign();
            yield Promise.all([waitElection2, waitElection3]);
        }));
        it('should proclaim if campaign repeatly', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(election.isCampaigning).to.be.true;
            const oldValue = yield client.get(election.leaderKey);
            chai_1.expect(oldValue).to.equal('candidate');
            yield election.campaign('new-value');
            const newValue = yield client.get(election.leaderKey);
            chai_1.expect(newValue).to.equal('new-value');
        }));
        it('only proclaim if value changed', () => __awaiter(this, void 0, void 0, function* () {
            const proclaimFn = sinon
                .stub(election, 'proclaim')
                .callsFake(src_1.Election.prototype.proclaim.bind(election));
            yield election.campaign('candidate');
            chai_1.expect(proclaimFn.notCalled).to.be.true;
            yield election.campaign('candidate2');
            chai_1.expect(proclaimFn.calledOnce).to.be.true;
            proclaimFn.restore();
        }));
    });
    describe('proclaim', () => {
        it('should update if is a leader', () => __awaiter(this, void 0, void 0, function* () {
            const oldValue = yield client.get(election.leaderKey);
            chai_1.expect(oldValue).to.equal('candidate');
            yield election.proclaim('new-candidate');
            const newValue = yield client.get(election.leaderKey);
            chai_1.expect(newValue).to.equal('new-candidate');
        }));
        it('should throw if not a leader', () => __awaiter(this, void 0, void 0, function* () {
            yield election.resign();
            const whenCatch = sinon.spy();
            yield election.proclaim('new-candidate').catch(whenCatch);
            chai_1.expect(whenCatch.calledOnce).to.be.true;
        }));
    });
    describe('getLeader', () => {
        it('should return leader key', () => __awaiter(this, void 0, void 0, function* () {
            const leaderKey = yield election.getLeader();
            chai_1.expect(election.leaderKey).to.equal(leaderKey);
        }));
        it('should throw if no leader', () => __awaiter(this, void 0, void 0, function* () {
            yield election.resign();
            const whenCatch = sinon.spy();
            yield election.getLeader().catch(whenCatch);
            chai_1.expect(whenCatch.calledOnce).to.be.true;
        }));
    });
    describe('observe', () => {
        it('should emit leader event', () => __awaiter(this, void 0, void 0, function* () {
            const client2 = new src_1.Etcd3(util_1.getOptions());
            const election2 = new src_1.Election(client2, 'test-election', 1);
            let currentLeaderKey = '';
            election.on('leader', leaderKey => currentLeaderKey = leaderKey);
            chai_1.expect(election.isObserving).to.be.true;
            // looking for current leader and emit it
            yield sleep(30);
            chai_1.expect(currentLeaderKey).to.equal(election.leaderKey);
            const waitElection2 = election2.campaign('candidate2');
            yield election.resign();
            yield waitElection2;
            // waiting for watcher
            yield sleep(30);
            chai_1.expect(currentLeaderKey).to.equal(election2.leaderKey);
        }));
        it('should wait for leader', () => __awaiter(this, void 0, void 0, function* () {
            yield election.resign();
            let currentLeaderKey = '';
            election.on('leader', leaderKey => currentLeaderKey = leaderKey);
            // waiting for watcher created
            yield sleep(30);
            yield election.campaign('candidate');
            yield sleep(30);
            chai_1.expect(currentLeaderKey).to.equal(election.leaderKey);
        }));
    });
});
