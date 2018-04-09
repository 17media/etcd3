/// <reference types="node" />
import { EventEmitter } from 'events';
export declare const zeroKey: Buffer;
export declare const emptyKey: Buffer;
/**
 * Converts the input to a buffer, if it is not already.
 */
export declare function toBuffer(input: string | Buffer | number): Buffer;
/**
 * Returns the range_end value for a query for the provided prefix.
 */
export declare function endRangeForPrefix(prefix: Buffer): Buffer;
/**
 * NSApplicator is used internally to apply a namespace to a given request. It
 * can only be used for a single application.
 */
export declare class NSApplicator {
    private readonly prefix;
    private endRange;
    constructor(prefix: Buffer);
    /**
     * Applies the namespace prefix to the buffer, if it exists.
     */
    applyKey(buf?: Buffer): Buffer | undefined;
    /**
     * Applies the namespace prefix to a range end. Due to how etcd handle 'zero'
     * ranges, we need special logic here.
     */
    applyRangeEnd(buf?: Buffer): Buffer | undefined;
    /**
     * Shortcut function to apply the namespace to a GRPC CRUD request. It returns
     * a new request, it does not modify the original.
     */
    applyToRequest<T extends {
        key?: Buffer;
        range_end?: Buffer;
    }>(req: T): T;
    /**
     * Removes a namespace prefix from the provided buffer. Throws if the buffer
     * doesn't have the prefix.
     */
    unprefix(buf: Buffer): Buffer;
}
/**
 * Returns items with the smallest value as picked by the `prop` function.
 */
export declare function minBy<T>(items: T[], prop: (x: T) => number): T[];
/**
 * Returns a random element from the list of items.
 */
export declare function sample<T>(items: T[]): T;
/**
 * Returns a promise that resolves after a certain amount of time.
 */
export declare function delay(duration: number): Promise<void>;
/**
 * Implementation of lodash forOwn, with stronger typings and no dependency ;)
 */
export declare function forOwn<T>(obj: T, iterator: <K extends keyof T>(value: T[K], key: K) => void): void;
/**
 * onceEvent returns a promise that resolves once any of the listed events
 * fire on the emitter.
 */
export declare function onceEvent(emitter: EventEmitter, ...events: string[]): Promise<any>;
/**
 * PromiseWrap provides promise-like functions that auto-invoke an exec
 * method when called.
 */
export declare abstract class PromiseWrap<T> implements PromiseLike<T> {
    /**
     * then implements Promiselike.then()
     */
    then<R, V>(onFulfilled: (value: T) => R | Promise<R>, onRejected?: (err: any) => V | Promise<V>): Promise<R | V>;
    /**
     * catch implements Promiselike.catch()
     */
    catch<R>(onRejected: (err: any) => R | Promise<R>): Promise<T | R>;
    /**
     * createPromise should ben override to run the promised action.
     */
    protected abstract createPromise(): Promise<T>;
}
