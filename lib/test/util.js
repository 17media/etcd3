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
const fs = require("fs");
const tls = require("tls");
const src_1 = require("../src");
const rootCertificate = fs.readFileSync(`${__dirname}/certs/certs/ca.crt`);
const tlsCert = fs.readFileSync(`${__dirname}/certs/certs/etcd0.localhost.crt`);
const tlsKey = fs.readFileSync(`${__dirname}/certs/private/etcd0.localhost.key`);
const etcdSourceAddress = process.env.ETCD_ADDR || '127.0.0.1:2379';
const [etcdSourceHost, etcdSourcePort] = etcdSourceAddress.split(':');
/**
 * Proxy is a TCP proxy for etcd, used so that we can simulate network failures
 * and disruptions in a cross-platform manner (i.e no reliance on tcpkill
 * or ip link)
 */
class Proxy {
    constructor() {
        this.isActive = false;
        this.connections = [];
    }
    /**
     * activate creates the proxy server.
     */
    activate() {
        return new Promise((resolve, reject) => {
            this.server = tls.createServer({ cert: tlsCert, key: tlsKey, ALPNProtocols: ['h2'] }, clientCnx => this.handleIncoming(clientCnx));
            this.server.listen(0, '127.0.0.1');
            this.server.on('listening', () => {
                const addr = this.server.address();
                this.host = addr.address;
                this.port = addr.port;
                this.isActive = true;
                resolve();
            });
            this.server.on('error', reject);
        });
    }
    /**
     * pause temporarily shuts down the server, but does not 'deactivate' the
     * proxy; new connections will still try to hit it. Can be restored with
     * resume().
     */
    pause() {
        this.server.close();
        this.connections.forEach(cnx => cnx.end());
        this.connections = [];
    }
    /**
     * Starts up a previously stopped server.
     */
    resume() {
        this.server.listen(this.port, this.host);
    }
    /**
     * Destroys a previously-active proxy server.
     */
    deactivate() {
        this.server.close();
        this.isActive = false;
    }
    /**
     * Returns the address the server is listening on.
     */
    address() {
        return `${this.host}:${this.port}`;
    }
    handleIncoming(clientCnx) {
        let serverConnected = false;
        const serverBuffer = [];
        const serverCnx = tls.connect(etcdSourcePort, etcdSourceHost, {
            secureContext: tls.createSecureContext({ ca: rootCertificate }),
            ALPNProtocols: ['h2'],
        }, () => {
            if (serverBuffer.length > 0) {
                serverCnx.write(Buffer.concat(serverBuffer));
            }
            serverConnected = true;
        });
        let ended = false;
        const end = (err) => {
            if (err instanceof Error) {
                throw err;
            }
            ended = true;
            clientCnx.end();
            serverCnx.end();
            this.connections = this.connections.filter(c => c.end !== end);
        };
        serverCnx.on('data', (data) => {
            if (!ended) {
                clientCnx.write(data);
            }
        });
        serverCnx.on('close', end);
        serverCnx.on('error', end);
        clientCnx.on('data', (data) => {
            if (serverConnected && !ended) {
                serverCnx.write(data);
            }
            else {
                serverBuffer.push(data);
            }
        });
        clientCnx.on('close', end);
        clientCnx.on('error', end);
        this.connections.push({ end });
    }
}
exports.Proxy = Proxy;
exports.proxy = new Proxy();
/**
 * Returns the host to test against.
 */
function getHost() {
    if (exports.proxy.isActive) {
        return exports.proxy.address();
    }
    return process.env.ETCD_ADDR || '127.0.0.1:2379';
}
exports.getHost = getHost;
/**
 * Returns etcd options to use for connections.
 */
function getOptions(defaults = {}) {
    return Object.assign({ hosts: getHost(), credentials: { rootCertificate } }, defaults);
}
exports.getOptions = getOptions;
/**
 * Returns a promise that throws if the promise is resolved or rejected with
 * something other than the provided constructor
 */
function expectReject(promise, err) {
    return promise
        .then(() => {
        throw new Error('expected to reject');
    })
        .catch(actualErr => {
        if (!(actualErr instanceof err)) {
            console.error(actualErr.stack);
            chai_1.expect(actualErr).to.be.an.instanceof(err);
        }
    });
}
exports.expectReject = expectReject;
/**
 * Creates an etcd client with the default options and seeds some keys.
 */
function createTestClientAndKeys() {
    const client = new src_1.Etcd3(getOptions());
    return Promise.all([
        client.put('foo1').value('bar1'),
        client.put('foo2').value('bar2'),
        client.put('foo3').value('{"value":"bar3"}'),
        client.put('baz').value('bar5'),
    ]).then(() => client);
}
exports.createTestClientAndKeys = createTestClientAndKeys;
/**
 * Destroys the etcd client and wipes all keys.
 */
function tearDownTestClient(client) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.delete().all();
        client.close();
    });
}
exports.tearDownTestClient = tearDownTestClient;
