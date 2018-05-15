import { IBackoffStrategy } from './backoff/backoff';
/**
 * The SharedPool holds some generic 'resource' which can be checked out by
 * multiple clients and failed with a backoff strategy. This differs from
 * generic connection pools, which generally allow only a single caller
 * to hold a client.
 *
 * todo(connor4312): move this to a standalone module to be shared with
 * node-influx.
 */
export declare class SharedPool<T> {
    private strategy;
    private static deterministicInsertion;
    private resources;
    private contentionCount;
    constructor(strategy: IBackoffStrategy);
    /**
     * Add inserts an item into the shared pool and makes it immediately available.
     */
    add(resource: T): void;
    /**
     * Returns an instance of the resource, or throws a
     * @return {T} [description]
     */
    pull(): Promise<T>;
    /**
     * Fail marks a request from the resource as having failed. It will be backed
     * off and not returned based on a timeout.
     */
    fail(resource: T): void;
    /**
     * Succeed marks a request from the resources as having been successful,
     * reseting any active backoff strategy.
     */
    succeed(resource: T): void;
    /**
     * Returns the number of callers blocked waiting on a connection to be
     * available in the pool.
     */
    contention(): number;
    /**
     * Returns the resources currently available.
     */
    available(now?: number): T[];
    /**
     * Returns the resources currently unavailable in backoff.
     */
    unavailable(now?: number): T[];
    /**
     * Returns all resources in the pool.
     */
    all(): T[];
    private recordFor(resource);
}
