import BigNumber from 'bignumber.js';
import { EtcdNoLeaderError, EtcdNotLeaderError } from './errors';
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
export class Election {
  public static readonly prefix = 'election';
  // public static readonly notLeaderError = new Error('election: not leader');
  // public static readonly noLeaderError = new Error('election: no leader');

  public readonly namespace: Namespace;
  public readonly lease: Lease;

  private leaseId = '';
  private _leaderKey = '';
  private _leaderRevision = '';
  private _isCampaigning = false;

  public get leaderKey(): string { return this._leaderKey; }
  public get leaderRevision(): string { return this._leaderRevision; }
  public get isReady(): boolean { return this.leaseId.length > 0; }
  public get isCampaigning(): boolean { return this._isCampaigning; }

  constructor(namespace: Namespace,
              public readonly name: string,
              public readonly ttl: number = 60) {
    this.namespace = namespace.namespace(this.getPrefix());
    this.lease = this.namespace.lease(ttl);
  }

  public async ready() {
    const leaseId = await this.lease.grant();

    if (!this.isReady) {
      this.leaseId = leaseId;
    }
  }

  public async campaign(value: string) {
    await this.ready();

    const result = await this.namespace
      .if(this.leaseId, 'Create', '==', 0)
      .then(this.namespace.put(this.leaseId).value(value).lease(this.leaseId))
      .else(this.namespace.get(this.leaseId))
      .commit();

    this._leaderKey = `${this.getPrefix()}${this.leaseId}`;
    this._leaderRevision = result.header.revision;
    this._isCampaigning = true;

    if (!result.succeeded) {
      try {
        const kv = result.responses[0].response_range.kvs[0];
        this._leaderRevision = kv.create_revision;
        if (kv.value.toString() !== value) {
          await this.proclaim(value);
        }
      } catch (error) {
        await this.resign();
        throw error;
      }
    }

    try {
      await this.waitForElected();
    } catch (error) {
      await this.resign();
      throw error;
    }
  }

  public async proclaim(value: any) {
    if (!this._isCampaigning) {
      throw new EtcdNotLeaderError();
    }

    const r = await this.namespace
      .if(this.leaseId, 'Create', '==', this._leaderRevision)
      .then(this.namespace.put(this.leaseId).value(value).lease(this.leaseId))
      .commit();

    if (!r.succeeded) {
      this._leaderKey = '';
      throw new EtcdNotLeaderError();
    }
  }

  public async resign() {
    if (!this.isCampaigning) {
      return;
    }

    try {
      await this.namespace
        .if(this.leaseId, 'Create', '==', this._leaderRevision)
        .then(this.namespace.delete().key(this.leaseId))
        .commit();
    } catch (e) {
      // If fail, revoke lease for performing resigning
      await this.lease.revoke();
      this.leaseId = '';
    }

    this._leaderKey = '';
    this._leaderRevision = '';
    this._isCampaigning = false;
  }

  public async getLeader() {
    const result = await this.namespace.getAll().sort('Create', 'Ascend').keys();
    if (result.length === 0) {
      throw new EtcdNoLeaderError();
    }
    return `${this.getPrefix()}${result[0]}`;
  }

  public getPrefix() {
    return `${Election.prefix}/${this.name}/`;
  }

  private async waitForElected() {
    // find last create before this
    const lastRevision = new BigNumber(this.leaderRevision).minus(1).toString();
    const result = await this.namespace.getAll().maxCreateRevision(lastRevision).keys();

    // no one before this, elected
    if (result.length === 0) {
      return;
    }

    const lastKey = result[0];
    const watcher = await this.namespace.watch().key(lastKey).create();
    const deleteOrError = new Promise(async (resolve, reject) => {
      // waiting for deleting of that key
      watcher.on('delete', resolve);
      watcher.on('error', reject);
    });

    try {
      await deleteOrError;
    } finally {
      await watcher.cancel();
    }
  }
}
