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
const grpc = require("grpc");
const src_1 = require("../src");
const util_1 = require("./util");
function wipeAll(things) {
    return things.then(items => Promise.all(items.map(item => item.delete())));
}
describe('roles and auth', () => {
    let client;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () { return (client = yield util_1.createTestClientAndKeys()); }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () { return yield util_1.tearDownTestClient(client); }));
    describe('management', () => {
        afterEach(() => wipeAll(client.getRoles()));
        const expectRoles = (expected) => __awaiter(this, void 0, void 0, function* () {
            const list = yield client.getRoles();
            chai_1.expect(list.map(r => r.name)).to.deep.equal(expected);
        });
        it('create and deletes', () => __awaiter(this, void 0, void 0, function* () {
            const fooRole = yield client.role('foo').create();
            yield expectRoles(['foo']);
            yield fooRole.delete();
            yield expectRoles([]);
        }));
        it('throws on existing roles', () => __awaiter(this, void 0, void 0, function* () {
            yield client.role('foo').create();
            yield util_1.expectReject(client.role('foo').create(), src_1.EtcdRoleExistsError);
        }));
        it('throws on deleting a non-existent role', () => __awaiter(this, void 0, void 0, function* () {
            yield util_1.expectReject(client.role('foo').delete(), src_1.EtcdRoleNotFoundError);
        }));
        it('throws on granting permission to a non-existent role', () => __awaiter(this, void 0, void 0, function* () {
            yield util_1.expectReject(client.role('foo').grant({
                permission: 'Read',
                range: client.range({ prefix: '111' }),
            }), src_1.EtcdRoleNotFoundError);
        }));
        it('round trips permission grants', () => __awaiter(this, void 0, void 0, function* () {
            const fooRole = yield client.role('foo').create();
            yield fooRole.grant({
                permission: 'Read',
                range: client.range({ prefix: '111' }),
            });
            const perms = yield fooRole.permissions();
            chai_1.expect(perms).to.containSubset([
                {
                    permission: 'Read',
                    range: client.range({ prefix: '111' }),
                },
            ]);
            yield fooRole.revoke(perms[0]);
            chai_1.expect(yield fooRole.permissions()).to.have.length(0);
        }));
    });
    describe('users', () => {
        let fooRole;
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            fooRole = client.role('foo');
            yield fooRole.create();
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield fooRole.delete();
            yield wipeAll(client.getUsers());
        }));
        it('creates users', () => __awaiter(this, void 0, void 0, function* () {
            chai_1.expect(yield client.getUsers()).to.have.lengthOf(0);
            yield client.user('connor').create('password');
            chai_1.expect(yield client.getUsers()).to.containSubset([{ name: 'connor' }]);
        }));
        it('throws on existing users', () => __awaiter(this, void 0, void 0, function* () {
            yield client.user('connor').create('password');
            yield util_1.expectReject(client.user('connor').create('password'), src_1.EtcdUserExistsError);
        }));
        it('throws on regranting the same role multiple times', () => __awaiter(this, void 0, void 0, function* () {
            const user = yield client.user('connor').create('password');
            yield util_1.expectReject(user.removeRole(fooRole), src_1.EtcdRoleNotGrantedError);
        }));
        it('throws on granting a non-existent role', () => __awaiter(this, void 0, void 0, function* () {
            const user = yield client.user('connor').create('password');
            yield util_1.expectReject(user.addRole('wut'), src_1.EtcdRoleNotFoundError);
        }));
        it('throws on deleting a non-existent user', () => __awaiter(this, void 0, void 0, function* () {
            yield util_1.expectReject(client.user('connor').delete(), src_1.EtcdUserNotFoundError);
        }));
        it('round trips roles', () => __awaiter(this, void 0, void 0, function* () {
            const user = yield client.user('connor').create('password');
            yield user.addRole(fooRole);
            chai_1.expect(yield user.roles()).to.containSubset([{ name: 'foo' }]);
            yield user.removeRole(fooRole);
            chai_1.expect(yield user.roles()).to.have.lengthOf(0);
        }));
    });
    describe('password auth', () => {
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            yield wipeAll(client.getUsers());
            yield wipeAll(client.getRoles());
            // We need to set up a root user and root role first, otherwise etcd
            // will yell at us.
            const rootUser = yield client.user('root').create('password');
            yield rootUser.addRole('root');
            yield client.user('connor').create('password');
            const normalRole = yield client.role('rw_prefix_f').create();
            yield normalRole.grant({
                permission: 'Readwrite',
                range: client.range({ prefix: 'f' }),
            });
            yield normalRole.addUser('connor');
            yield client.auth.authEnable();
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            const rootClient = new src_1.Etcd3(util_1.getOptions({
                auth: {
                    username: 'root',
                    password: 'password',
                },
            }));
            yield rootClient.auth.authDisable();
            rootClient.close();
            yield wipeAll(client.getUsers());
            yield wipeAll(client.getRoles());
        }));
        it('allows authentication using the correct credentials', () => __awaiter(this, void 0, void 0, function* () {
            const authedClient = new src_1.Etcd3(util_1.getOptions({
                auth: {
                    username: 'connor',
                    password: 'password',
                },
            }));
            yield authedClient.put('foo').value('bar');
            authedClient.close();
        }));
        it('rejects modifying a key the client has no access to', () => __awaiter(this, void 0, void 0, function* () {
            const authedClient = new src_1.Etcd3(util_1.getOptions({
                auth: {
                    username: 'connor',
                    password: 'password',
                },
            }));
            yield util_1.expectReject(authedClient
                .put('wut')
                .value('bar')
                .exec(), src_1.EtcdPermissionDeniedError);
            authedClient.close();
        }));
        it('throws when using incorrect credentials', () => __awaiter(this, void 0, void 0, function* () {
            const authedClient = new src_1.Etcd3(util_1.getOptions({
                auth: {
                    username: 'connor',
                    password: 'bad password',
                },
            }));
            yield util_1.expectReject(authedClient
                .put('foo')
                .value('bar')
                .exec(), src_1.EtcdAuthenticationFailedError);
            authedClient.close();
        }));
        it('automatically retrieves a new token if the existing one is invalid', () => __awaiter(this, void 0, void 0, function* () {
            const authedClient = new src_1.Etcd3(util_1.getOptions({
                auth: {
                    username: 'connor',
                    password: 'password',
                },
            }));
            const auth = authedClient.pool.authenticator;
            const badMeta = new grpc.Metadata();
            badMeta.add('token', 'lol');
            auth.awaitingMetadata = Promise.resolve(badMeta);
            yield authedClient.put('foo').value('bar'); // should retry and not throw
            authedClient.close();
            const updatedMeta = yield auth.awaitingMetadata;
            chai_1.expect(updatedMeta.get('token')).to.not.deep.equal(badMeta.get('token'));
        }));
    });
});
