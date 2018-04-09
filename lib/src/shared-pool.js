"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
/**
 * The SharedPool holds some generic 'resource' which can be checked out by
 * multiple clients and failed with a backoff strategy. This differs from
 * generic connection pools, which generally allow only a single caller
 * to hold a client.
 *
 * todo(connor4312): move this to a standalone module to be shared with
 * node-influx.
 */
class SharedPool {
    constructor(strategy) {
        this.strategy = strategy;
        this.resources = [];
        this.contentionCount = 0;
    }
    /**
     * Add inserts an item into the shared pool and makes it immediately available.
     */
    add(resource) {
        this.resources.push({
            resource,
            lastChosenAt: SharedPool.deterministicInsertion ? this.resources.length : 0,
            backoff: this.strategy,
            availableAfter: 0,
        });
    }
    /**
     * Returns an instance of the resource, or throws a
     * @return {T} [description]
     */
    pull() {
        if (this.resources.length === 0) {
            throw new Error('Attempted to .pull() from an empty pool');
        }
        const now = Date.now();
        const available = this.resources.filter(r => r.availableAfter <= now);
        if (available.length > 0) {
            const lastChosen = util_1.sample(util_1.minBy(available, r => r.lastChosenAt));
            lastChosen.lastChosenAt = now;
            return Promise.resolve(lastChosen.resource);
        }
        const nextAvailable = util_1.minBy(this.resources, r => r.availableAfter);
        this.contentionCount++;
        return util_1.delay(nextAvailable[0].availableAfter - now).then(() => {
            this.contentionCount--;
            return this.pull();
        });
    }
    /**
     * Fail marks a request from the resource as having failed. It will be backed
     * off and not returned based on a timeout.
     */
    fail(resource) {
        const record = this.recordFor(resource);
        const now = Date.now();
        // If multiple callers are using a resource when it fails, they'll
        // probably all fail it at once. Only take the first one.
        if (record.availableAfter > now) {
            return;
        }
        record.availableAfter = now + record.backoff.getDelay();
        record.backoff = record.backoff.next();
    }
    /**
     * Succeed marks a request from the resources as having been successful,
     * reseting any active backoff strategy.
     */
    succeed(resource) {
        const record = this.recordFor(resource);
        record.backoff = this.strategy;
        record.availableAfter = 0;
    }
    /**
     * Returns the number of callers blocked waiting on a connection to be
     * available in the pool.
     */
    contention() {
        return this.contentionCount;
    }
    /**
     * Returns the resources currently available.
     */
    available(now = Date.now()) {
        return this.resources.filter(r => r.availableAfter <= now).map(r => r.resource);
    }
    /**
     * Returns the resources currently unavailable in backoff.
     */
    unavailable(now = Date.now()) {
        return this.resources.filter(r => r.availableAfter <= now).map(r => r.resource);
    }
    /**
     * Returns all resources in the pool.
     */
    all() {
        return this.resources.map(r => r.resource);
    }
    recordFor(resource) {
        const record = this.resources.find(r => r.resource === resource);
        if (!record) {
            throw new Error('expected resource to be in the pool');
        }
        return record;
    }
}
exports.SharedPool = SharedPool;
