/// <reference types="node" />
import * as EventEmitter from 'events';
import { Lease } from './lease';
import { Namespace } from './namespace';
/**
 * Implmentation of etcd election.
 * @see https://github.com/coreos/etcd/blob/master/clientv3/concurrency/election.go
 *
 * @example
 * const client = new Etcd3()
 * const election = new Election(client, 'singleton_service')
 * const id = BigNumber.random().toString()
 *
 * // process will hang here until elected
 * await election.campaign(id)
 */
export declare class Election extends EventEmitter {
    readonly parent: Namespace;
    readonly name: string;
    readonly ttl: number;
    static readonly prefix: string;
    readonly namespace: Namespace;
    readonly lease: Lease;
    private leaseId;
    private _leaderKey;
    private _leaderRevision;
    private _isCampaigning;
    private _isObserving;
    readonly leaderKey: string;
    readonly leaderRevision: string;
    readonly isReady: boolean;
    readonly isCampaigning: boolean;
    readonly isObserving: boolean;
    constructor(parent: Namespace, name: string, ttl?: number);
    on(event: 'leader', listener: (leaderKey: string) => void): this;
    on(event: 'error', listener: (error: any) => void): this;
    on(event: string | symbol, listener: Function): this;
    addListener(event: string | symbol, listener: Function): this;
    once(event: string | symbol, listener: Function): this;
    ready(): Promise<void>;
    campaign(value: string): Promise<void>;
    proclaim(value: any): Promise<void>;
    resign(): Promise<void>;
    getLeader(): Promise<string>;
    getPrefix(): string;
    private waitForElected();
    private observe();
    private tryObserve();
    private shouldObserve(event);
}
