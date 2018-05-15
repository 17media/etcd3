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
describe('crud', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_1.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    describe('get() / getAll()', () => {
        it('lists all values', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client.getAll().strings()).to.deep.equal({
                foo1: 'bar1',
                foo2: 'bar2',
                foo3: '{"value":"bar3"}',
                baz: 'bar5',
            });
        }));
        it('gets single keys with various encoding', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client.get('foo1').string()).to.equal('bar1');
            chai_1.expect(yield client.get('foo2').buffer()).to.deep.equal(Buffer.from('bar2'));
            chai_1.expect(yield client.get('foo3').json()).to.deep.equal({ value: 'bar3' });
            chai_1.expect(yield client.get('wut').string()).to.be.null;
        }));
        it('queries prefixes', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client
                .getAll()
                .prefix('fo')
                .strings()).to.deep.equal({
                foo1: 'bar1',
                foo2: 'bar2',
                foo3: '{"value":"bar3"}',
            });
        }));
        it('gets keys', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client.getAll().keys()).to.have.members(['foo1', 'foo2', 'foo3', 'baz']);
            chai_1.expect(yield client.getAll().keyBuffers()).to.have.deep.members([
                Buffer.from('foo1'),
                Buffer.from('foo2'),
                Buffer.from('foo3'),
                Buffer.from('baz'),
            ]);
        }));
        it('counts', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client.getAll().count()).to.equal(4);
        }));
        it('sorts', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client
                .getAll()
                .prefix('foo')
                .sort('Key', 'Ascend')
                .limit(2)
                .keys()).to.deep.equal(['foo1', 'foo2']);
            chai_1.expect(yield client
                .getAll()
                .prefix('foo')
                .sort('Key', 'Descend')
                .limit(2)
                .keys()).to.deep.equal(['foo3', 'foo2']);
        }));
    });
    describe('delete()', () => {
        it('deletes all', () => __awaiter(this, void 0, void 0, function* () {
            yield client.delete().all();
            chai_1.expect(yield client.getAll().count()).to.equal(0);
        }));
        it('deletes prefix', () => __awaiter(this, void 0, void 0, function* () {
            yield client.delete().prefix('foo');
            chai_1.expect(yield client.getAll().keys()).to.deep.equal(['baz']);
        }));
        it('gets previous', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client
                .delete()
                .key('foo1')
                .getPrevious()).to.containSubset([
                {
                    key: new Buffer('foo1'),
                    value: new Buffer('bar1'),
                },
            ]);
        }));
        describe('put()', () => {
            it('allows touching key revisions', () => __awaiter(this, void 0, void 0, function* () {
                const original = (yield client.get('foo1').exec()).kvs[0].mod_revision;
                yield client.put('foo1').touch();
                const updated = (yield client.get('foo1').exec()).kvs[0].mod_revision;
                chai_1.expect(Number(updated)).to.be.greaterThan(Number(original));
            }));
            it('updates key values', () => __awaiter(this, void 0, void 0, function* () {
                yield client.put('foo1').value('updated');
                chai_1.expect(yield client.get('foo1').string()).to.equal('updated');
            }));
            it('includes previous values', () => __awaiter(this, void 0, void 0, function* () {
                chai_1.expect(yield client
                    .put('foo1')
                    .value('updated')
                    .getPrevious()).to.containSubset({
                    key: new Buffer('foo1'),
                    value: new Buffer('bar1'),
                });
            }));
        });
    });
});
