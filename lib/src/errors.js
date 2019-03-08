"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Thrown when an internal assertion fails.
 */
class ClientRuntimeError extends Error {
    constructor(message) {
        super(`${message} Please report this error at https://github.com/mixer/etcd3`);
    }
}
exports.ClientRuntimeError = ClientRuntimeError;
/**
 * A GRPCGenericError is rejected via the connection when some error occurs
 * that we can't be more specific about.
 */
class GRPCGenericError extends Error {
}
exports.GRPCGenericError = GRPCGenericError;
/**
 * GRPCConnectFailed is thrown when connecting to GRPC fails.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L151-L158
 */
class GRPCConnectFailedError extends GRPCGenericError {
}
exports.GRPCConnectFailedError = GRPCConnectFailedError;
/**
 * GRPCProtocolError is thrown when a protocol error occurs on the other end,
 * indicating that the external implementation is incorrect or incompatible.
 */
class GRPCProtocolError extends GRPCGenericError {
}
exports.GRPCProtocolError = GRPCProtocolError;
/**
 * GRPCInternalError is thrown when a internal error occurs on either end.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L145-L150
 */
class GRPCInternalError extends GRPCGenericError {
}
exports.GRPCInternalError = GRPCInternalError;
/**
 * GRPCCancelledError is emitted when an ongoing call is cancelled.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L48-L49
 */
class GRPCCancelledError extends GRPCGenericError {
}
exports.GRPCCancelledError = GRPCCancelledError;
/**
 * Unknown error.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L50-L57
 */
class GRPCUnknownError extends GRPCGenericError {
}
exports.GRPCUnknownError = GRPCUnknownError;
/**
 * Client specified an invalid argument.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L58-L64
 */
class GRPCInvalidArgumentError extends GRPCGenericError {
}
exports.GRPCInvalidArgumentError = GRPCInvalidArgumentError;
/**
 * Deadline expired before operation could complete.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L65-L72
 */
class GRPCDeadlineExceededError extends GRPCGenericError {
}
exports.GRPCDeadlineExceededError = GRPCDeadlineExceededError;
/**
 * Some requested entity (e.g., file or directory) was not found.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L73-L74
 */
class GRPCNotFoundError extends GRPCGenericError {
}
exports.GRPCNotFoundError = GRPCNotFoundError;
/**
 * Some entity that we attempted to create (e.g., file or directory) already exists.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L75-L79
 */
class GRPCAlreadyExistsError extends GRPCGenericError {
}
exports.GRPCAlreadyExistsError = GRPCAlreadyExistsError;
/**
 * Some resource has been exhausted, perhaps a per-user quota, or
 * perhaps the entire file system is out of space.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L89-L93
 */
class GRPCResourceExhastedError extends GRPCGenericError {
}
exports.GRPCResourceExhastedError = GRPCResourceExhastedError;
/**
 * Operation was rejected because the system is not in a state
 * required for the operation's execution.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L94-L116
 */
class GRPCFailedPreconditionError extends GRPCGenericError {
}
exports.GRPCFailedPreconditionError = GRPCFailedPreconditionError;
/**
 * The operation was aborted, typically due to a concurrency issue
 * like sequencer check failures, transaction aborts, etc.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L117-L124
 */
class GRPCAbortedError extends GRPCGenericError {
}
exports.GRPCAbortedError = GRPCAbortedError;
/**
 * Operation is not implemented or not supported/enabled in this service.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L143-L144
 */
class GRPCNotImplementedError extends GRPCGenericError {
}
exports.GRPCNotImplementedError = GRPCNotImplementedError;
/**
 * Operation was attempted past the valid range.  E.g., seeking or reading
 * past end of file.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L125-L142
 */
class GRPCOutOfRangeError extends GRPCGenericError {
}
exports.GRPCOutOfRangeError = GRPCOutOfRangeError;
/**
 * Unrecoverable data loss or corruption.
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L159-L160
 */
class GRPCDataLossError extends GRPCGenericError {
}
exports.GRPCDataLossError = GRPCDataLossError;
/**
 * EtcdError is an application error returned by etcd.
 */
class EtcdError extends Error {
}
exports.EtcdError = EtcdError;
/**
 * EtcdLeaseInvalidError is thrown when trying to renew a lease that's
 * expired.
 */
class EtcdLeaseInvalidError extends Error {
    constructor(leaseID) {
        super(`Lease ${leaseID} is expired or revoked`);
    }
}
exports.EtcdLeaseInvalidError = EtcdLeaseInvalidError;
/**
 * EtcdRoleExistsError is thrown when trying to create a role that already exists.
 */
class EtcdRoleExistsError extends Error {
}
exports.EtcdRoleExistsError = EtcdRoleExistsError;
/**
 * EtcdUserExistsError is thrown when trying to create a user that already exists.
 */
class EtcdUserExistsError extends Error {
}
exports.EtcdUserExistsError = EtcdUserExistsError;
/**
 * EtcdRoleNotGrantedError is thrown when trying to revoke a role from a user
 * to which the role is not granted.
 */
class EtcdRoleNotGrantedError extends Error {
}
exports.EtcdRoleNotGrantedError = EtcdRoleNotGrantedError;
/**
 * EtcdRoleNotFoundError is thrown when trying to operate on a role that does
 * not exist.
 */
class EtcdRoleNotFoundError extends Error {
}
exports.EtcdRoleNotFoundError = EtcdRoleNotFoundError;
/**
 * EtcdUserNotFoundError is thrown when trying to operate on a user that does
 * not exist.
 */
class EtcdUserNotFoundError extends Error {
}
exports.EtcdUserNotFoundError = EtcdUserNotFoundError;
/**
 * EtcdLockFailedError is thrown when we fail to aquire a lock.
 */
class EtcdLockFailedError extends Error {
}
exports.EtcdLockFailedError = EtcdLockFailedError;
/**
 * EtcdAuthenticationFailedError is thrown when an invalid username/password
 * combination is submitted.
 *
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L161-L165
 */
class EtcdAuthenticationFailedError extends Error {
}
exports.EtcdAuthenticationFailedError = EtcdAuthenticationFailedError;
/**
 * EtcdInvalidAuthTokenError is thrown when an invalid or expired authentication
 * token is presented.
 */
class EtcdInvalidAuthTokenError extends Error {
}
exports.EtcdInvalidAuthTokenError = EtcdInvalidAuthTokenError;
/**
 * EtcdPermissionDeniedError is thrown when the user attempts to modify a key
 * that they don't have access to.
 *
 * Also can be emitted from GRPC.
 *
 * @see https://github.com/grpc/grpc/blob/v1.4.x/src/node/src/constants.js#L80-L88
 */
class EtcdPermissionDeniedError extends Error {
}
exports.EtcdPermissionDeniedError = EtcdPermissionDeniedError;
/**
 * EtcdWatchStreamEnded is emitted when a watch stream closes gracefully.
 * This is an unexpected occurrence.
 *
 * @see https://github.com/mixer/etcd3/issues/72#issuecomment-386851271
 */
class EtcdWatchStreamEnded extends Error {
    constructor() {
        super('The etcd watch stream was unexpectedly ended');
    }
}
exports.EtcdWatchStreamEnded = EtcdWatchStreamEnded;
/*
 * Etcd leader election has no leader
 */
class EtcdNoLeaderError extends Error {
}
exports.EtcdNoLeaderError = EtcdNoLeaderError;
/**
 * Process in this etcd leader election is not a leader.
 */
class EtcdNotLeaderError extends Error {
}
exports.EtcdNotLeaderError = EtcdNotLeaderError;
/**
 * An STMConflictError is thrown from the `SoftwareTransaction.transact`
 * if we continue to get conflicts and exceed the maximum number
 * of retries.
 */
class STMConflictError extends Error {
    constructor() {
        super('A conflict occurred executing the software transaction');
    }
}
exports.STMConflictError = STMConflictError;
/**
 * Mapping of GRPC error messages to typed error. GRPC errors are untyped
 * by default and sourced from within a mess of C code.
 */
const grpcMessageToError = new Map([
    ['Connect Failed', GRPCConnectFailedError],
    ['Channel Disconnected', GRPCConnectFailedError],
    ['Endpoint read failed', GRPCProtocolError],
    ['Got config after disconnection', GRPCProtocolError],
    ['Failed to create subchannel', GRPCProtocolError],
    ['Attempt to send initial metadata after stream was closed', GRPCProtocolError],
    ['Attempt to send message after stream was closed', GRPCProtocolError],
    ['Last stream closed after sending GOAWAY', GRPCProtocolError],
    ['Failed parsing HTTP/2', GRPCProtocolError],
    ['TCP stream shutting down', GRPCProtocolError],
    ['Secure read failed', GRPCProtocolError],
    ['Handshake read failed', GRPCProtocolError],
    ['Handshake write failed', GRPCProtocolError],
    ['FD shutdown', GRPCInternalError],
    ['Failed to load file', GRPCInternalError],
    ['Unable to configure socket', GRPCInternalError],
    ['Failed to add port to server', GRPCInternalError],
    ['Failed to prepare server socket', GRPCInternalError],
    ['Call batch failed', GRPCInternalError],
    ['Missing :authority or :path', GRPCInternalError],
    ['Cancelled before creating subchannel', GRPCCancelledError],
    ['Pick cancelled', GRPCCancelledError],
    ['Disconnected', GRPCCancelledError],
    ['etcdserver: role name already exists', EtcdRoleExistsError],
    ['etcdserver: user name already exists', EtcdUserExistsError],
    ['etcdserver: role is not granted to the user', EtcdRoleNotGrantedError],
    ['etcdserver: role name not found', EtcdRoleNotFoundError],
    ['etcdserver: user name not found', EtcdUserNotFoundError],
    ['etcdserver: authentication failed, invalid user ID or password', EtcdAuthenticationFailedError],
    ['etcdserver: permission denied', EtcdPermissionDeniedError],
    ['etcdserver: invalid auth token', EtcdInvalidAuthTokenError],
    ['etcdserver: requested lease not found', EtcdLeaseInvalidError],
]);
function getMatchingGrpcError(message) {
    for (const [key, value] of grpcMessageToError) {
        if (message.includes(key)) {
            return value;
        }
    }
    return null;
}
function rewriteErrorName(str, ctor) {
    return str.replace(/^Error:/, `${ctor.name}:`);
}
/**
 * Tries to convert an Etcd error string to an etcd error.
 */
function castGrpcErrorMessage(message) {
    const ctor = getMatchingGrpcError(message) || EtcdError;
    return new ctor(message);
}
exports.castGrpcErrorMessage = castGrpcErrorMessage;
/**
 * Tries to convert GRPC's generic, untyped errors to typed errors we can
 * consume. Yes, this method is abhorrent.
 */
function castGrpcError(err) {
    if (err.constructor !== Error) {
        return err; // it looks like it's already some kind of typed error
    }
    let ctor = getMatchingGrpcError(err.message);
    if (!ctor) {
        ctor = err.message.includes('etcdserver:') ? EtcdError : GRPCGenericError;
    }
    const castError = new ctor(rewriteErrorName(err.message, ctor));
    castError.stack = rewriteErrorName(String(err.stack), ctor);
    return castError;
}
exports.castGrpcError = castGrpcError;
