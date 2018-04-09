/**
 * Thrown when an internal assertion fails.
 */
export declare class ClientRuntimeError extends Error {
    constructor(message: string);
}
/**
 * A GRPCGenericError is rejected via the connection when some error occurs
 * that we can't be more specific about.
 */
export declare class GRPCGenericError extends Error {
}
/**
 * GRPCConnectFailed is thrown when connecting to GRPC fails.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L151-L158
 */
export declare class GRPCConnectFailedError extends GRPCGenericError {
}
/**
 * GRPCProtocolError is thrown when a protocol error occurs on the other end,
 * indicating that the external implementation is incorrect or incompatible.
 */
export declare class GRPCProtocolError extends GRPCGenericError {
}
/**
 * GRPCInternalError is thrown when a internal error occurs on either end.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L145-L150
 */
export declare class GRPCInternalError extends GRPCGenericError {
}
/**
 * GRPCCancelledError is emitted when an ongoing call is cancelled.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L48-L49
 */
export declare class GRPCCancelledError extends GRPCGenericError {
}
/**
 * Unknown error.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L50-L57
 */
export declare class GRPCUnknownError extends GRPCGenericError {
}
/**
 * Client specified an invalid argument.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L58-L64
 */
export declare class GRPCInvalidArgumentError extends GRPCGenericError {
}
/**
 * Deadline expired before operation could complete.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L65-L72
 */
export declare class GRPCDeadlineExceededError extends GRPCGenericError {
}
/**
 * Some requested entity (e.g., file or directory) was not found.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L73-L74
 */
export declare class GRPCNotFoundError extends GRPCGenericError {
}
/**
 * Some entity that we attempted to create (e.g., file or directory) already exists.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L75-L79
 */
export declare class GRPCAlreadyExistsError extends GRPCGenericError {
}
/**
 * Some resource has been exhausted, perhaps a per-user quota, or
 * perhaps the entire file system is out of space.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L89-L93
 */
export declare class GRPCResourceExhastedError extends GRPCGenericError {
}
/**
 * Operation was rejected because the system is not in a state
 * required for the operation's execution.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L94-L116
 */
export declare class GRPCFailedPreconditionError extends GRPCGenericError {
}
/**
 * The operation was aborted, typically due to a concurrency issue
 * like sequencer check failures, transaction aborts, etc.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L117-L124
 */
export declare class GRPCAbortedError extends GRPCGenericError {
}
/**
 * Operation is not implemented or not supported/enabled in this service.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L143-L144
 */
export declare class GRPCNotImplementedError extends GRPCGenericError {
}
/**
 * Operation was attempted past the valid range.  E.g., seeking or reading
 * past end of file.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L125-L142
 */
export declare class GRPCOutOfRangeError extends GRPCGenericError {
}
/**
 * Unrecoverable data loss or corruption.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L159-L160
 */
export declare class GRPCDataLossError extends GRPCGenericError {
}
/**
 * EtcdError is an application error returned by etcd.
 */
export declare class EtcdError extends Error {
}
/**
 * EtcdLeaseInvalidError is thrown when trying to renew a lease that's
 * expired.
 */
export declare class EtcdLeaseInvalidError extends Error {
    constructor(leaseID: string);
}
/**
 * EtcdRoleExistsError is thrown when trying to create a role that already exists.
 */
export declare class EtcdRoleExistsError extends Error {
}
/**
 * EtcdUserExistsError is thrown when trying to create a user that already exists.
 */
export declare class EtcdUserExistsError extends Error {
}
/**
 * EtcdRoleNotGrantedError is thrown when trying to revoke a role from a user
 * to which the role is not granted.
 */
export declare class EtcdRoleNotGrantedError extends Error {
}
/**
 * EtcdRoleNotFoundError is thrown when trying to operate on a role that does
 * not exist.
 */
export declare class EtcdRoleNotFoundError extends Error {
}
/**
 * EtcdUserNotFoundError is thrown when trying to operate on a user that does
 * not exist.
 */
export declare class EtcdUserNotFoundError extends Error {
}
/**
 * EtcdLockFailedError is thrown when we fail to aquire a lock.
 */
export declare class EtcdLockFailedError extends Error {
}
/**
 * EtcdAuthenticationFailedError is thrown when an invalid username/password
 * combination is submitted.
 *
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L161-L165
 */
export declare class EtcdAuthenticationFailedError extends Error {
}
/**
 * EtcdInvalidAuthTokenError is thrown when an invalid or expired authentication
 * token is presented.
 */
export declare class EtcdInvalidAuthTokenError extends Error {
}
/**
 * EtcdPermissionDeniedError is thrown when the user attempts to modify a key
 * that they don't have access to.
 *
 * Also can be emitted from GRPC.
 *
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L80-L88
 */
export declare class EtcdPermissionDeniedError extends Error {
}
/**
 * Etcd leader election has no leader
 */
export declare class EtcdNoLeaderError extends Error {
}
/**
 * Process in this etcd leader election is not a leader.
 */
export declare class EtcdNotLeaderError extends Error {
}
/**
 * An STMConflictError is thrown from the `SoftwareTransaction.transact`
 * if we continue to get conflicts and exceed the maximum number
 * of retries.
 */
export declare class STMConflictError extends Error {
    constructor();
}
/**
 * Tries to convert an Etcd error string to an etcd error.
 */
export declare function castGrpcErrorMessage(message: string): Error;
/**
 * Tries to convert GRPC's generic, untyped errors to typed errors we can
 * consume. Yes, this method is abhorrent.
 */
export declare function castGrpcError(err: Error): Error;
