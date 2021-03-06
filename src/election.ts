import BigNumber from 'bignumber.js';
import { EventEmitter } from 'events';
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
export class Election extends EventEmitter {
  public static readonly prefix = 'election';

  private readonly namespace: Namespace;
  private lease!: Lease;

  // private leaseId = '';
  private _leaderKey = '';
  private _leaderRevision = '';
  private _isCampaigning = false;
  private _isObserving = false;

  public get leaderKey(): string { return this._leaderKey; }
  public get leaderRevision(): string { return this._leaderRevision; }
  // public get isReady(): boolean { return this.leaseId.length > 0; }
  public get isCampaigning(): boolean { return this._isCampaigning; }
  public get isObserving(): boolean { return this._isObserving; }

  constructor(public readonly parent: Namespace,
              public readonly name: string,
              public readonly ttl: number = 60) {
    super();
    this.namespace = parent.namespace(this.getPrefix());
    this.on('newListener', (event: string) => this.onNewListener(event));
  }

  public on(event: 'leader', listener: (leaderKey: string) => void): this;
  /**
   * errors are fired when:
   * - observe error
   * - lease lost
   */
  public on(event: 'error', listener: (error: any) => void): this;
  public on(event: string|symbol, listener: Function): this;
  public on(event: string, handler: Function): this {
    // tslint:disable-line
    return super.on(event, handler);
  }

  public async campaign(value: string) {
    await this.grantLease();

    const leaseId = await this.lease.grant();

    const result = await this.namespace
      .if(leaseId, 'Create', '==', 0)
      .then(this.namespace.put(leaseId).value(value).lease(leaseId))
      .else(this.namespace.get(leaseId))
      .commit();

    this._leaderKey = `${this.getPrefix()}${leaseId}`;
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

    const leaseId = await this.lease.grant();

    const r = await this.namespace
      .if(leaseId, 'Create', '==', this._leaderRevision)
      .then(this.namespace.put(leaseId).value(value).lease(leaseId))
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

    const leaseId = await this.lease.grant();

    const r = await this.namespace
      .if(leaseId, 'Create', '==', this._leaderRevision)
      .then(this.namespace.delete().key(leaseId))
      .commit();

    if (!r.succeeded) {
      // If fail, revoke lease for performing resigning
      await this.revokeLease();
      await this.grantLease();
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
    const result = await this.namespace
      .getAll()
      .maxCreateRevision(lastRevision)
      .sort('Create', 'Descend')
      .keys();

    // no one before this, elected
    if (result.length === 0) {
      return;
    }

    // wait all keys created ealier are deleted
    await waitForDeletes(this.namespace, result);
  }

  private async observe() {
    if (this._isObserving) {
      return;
    }

    try {
      this._isObserving = true;

      // looking for current leader
      let leaderKey = '';
      const result = await this.namespace.getAll().sort('Create', 'Ascend').keys();

      if (result.length === 0) {
        // if not found, wait for leader
        const watcher = await this.parent.watch().prefix(this.getPrefix()).create();
        try {
          leaderKey = await new Promise<string>((resolve, reject) => {
            watcher.on('put', kv => resolve(kv.key.toString()));
            watcher.on('error', reject);
          });
        } finally {
          await watcher.cancel();
        }
      } else {
        leaderKey = `${this.getPrefix()}${result[0]}`;
      }

      // emit current leader
      this.emit('leader', leaderKey);

      // wait for delete event
      await waitForDelete(this.parent, leaderKey);
    } finally {
      this._isObserving = false;
    }

    // only keep watch if listened
    if (this.listenerCount('leader') > 0) {
      this.tryObserve();
    }
  }

  private tryObserve(): void {
    this.observe().catch(error => {
      this.emit('error', error);
      this.tryObserve();
    });
  }

  private shouldObserve(event: string|symbol): boolean {
    return event === 'leader';
  }

  private onLeaseLost() {
    this.revokeLease().then(() => this.grantLease()).catch(error => this.emit('error', error));
  }

  private onNewListener(event: string) {
    if (this.shouldObserve(event)) {
      this.tryObserve();
    }
  }

  private async grantLease() {
    if (!this.lease) {
      this.lease = this.namespace.lease(this.ttl);
      this.lease.on('lost', () => this.onLeaseLost());
      // this.leaseId = await this.lease.grant();
    }
  }

  private async revokeLease() {
    if (!this.lease.revoked) {
      await this.lease.revoke();
      this.lease.removeAllListeners();
    }
  }
}

async function waitForDelete(namespace: Namespace, key: string) {
  const watcher = await namespace.watch().key(key).create();
  const deleteOrError = new Promise((resolve, reject) => {
    // waiting for deleting of that key
    watcher.once('delete', resolve);
    watcher.once('error', reject);
  });

  try {
    await deleteOrError;
  } finally {
    await watcher.cancel();
  }
}

async function waitForDeletes(namespace: Namespace, keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  if (keys.length === 1) {
    return waitForDelete(namespace, keys[0]);
  }

  const tasks = keys.map(key => async () => {
    const keyExisted = await namespace.get(key).string() !== null;
    if (!keyExisted) {
      return;
    }
    await waitForDelete(namespace, key);
  });

  let task = tasks.shift();

  while (task) {
    await task();
    task = tasks.shift();
  }
}
