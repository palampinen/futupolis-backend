'use strict';

import * as actionTypeCore from './action-type-core';
import _ from 'lodash';
import BPromise from 'bluebird';

let redisClient;

function getKey(uuid) {
  return `throttle--${ uuid }`;
}

function getHashPrevious(actionType) {
  return `${actionType}Previous`;
}

// Cache of action types
// Key: action type code
// Value: throttle time
let actionTypeCache;

/**
 * Initializes throttle core, by loading cache
 */
function initialize() {
  if (process.env.DISABLE_THROTTLE === 'true') {
    return;
  }

  redisClient = require('../util/redis').connect().client;

  return actionTypeCore.getActionTypes()
    .then(types => {
      actionTypeCache = {};

      types.forEach(type => {
        actionTypeCache[type.code] = type.cooldown;
      });
    });
}

function _hasCooldownPassed(cooldownTime, lastExecuted) {
  const timeNow = Date.now();
  const executeAllowed = lastExecuted + cooldownTime;

  return timeNow >= executeAllowed;
}

/**
 * Checks if throttle time has passed for given users
 * given action type.
 */
function canDoAction(uuid, actionType) {
  if (process.env.DISABLE_THROTTLE === 'true') {
    return BPromise.resolve(true);
  }

  const cooldownTime = actionTypeCache[actionType];
  if (cooldownTime === undefined || cooldownTime === null) {
    return BPromise.resolve(false);
  }

  return redisClient.hgetallAsync(getKey(uuid))
    .then(lastThrottlesByActionType => {
      if (!lastThrottlesByActionType) {
        return true;
      }
      const lastExecutedTime = lastThrottlesByActionType[actionType];
      if (!lastExecutedTime) {
        return true;
      }

      const lastExecuted = Number(lastExecutedTime);
      return _hasCooldownPassed(cooldownTime, lastExecuted);
    });
}

/**
 * Marks given user's given action as executed as this moment.
 */
function executeAction(uuid, actionType) {
  if (process.env.DISABLE_THROTTLE === 'true') {
    return BPromise.resolve();
  }

  const key = getKey(uuid);
  const timeNow = Date.now().toString();
  const trx = redisClient.multi();

  trx.watch(key);

  return redisClient.hgetallAsync(key).then(lastThrottlesByActionType => {
    const hashPrevious = getHashPrevious(actionType);
    const timePrevious = _.get(lastThrottlesByActionType, actionType, 'null');
    return trx.hmset(key, actionType, timeNow)
      .hmset(key, hashPrevious, timePrevious)
      .execAsync();
  });
}

/**
 * Rolls action's throttle state back to last known configuration.
 *
 * If the last known state is good, IE. nonnull, the state is restored,
 * otherwise throttle on that item is lifted. The stack has a depth
 * of 1, resulting in successive calls will lifting throttle on that item.
 */
function rollbackAction(uuid, actionType) {
  if (process.env.DISABLE_THROTTLE === 'true') {
    return BPromise.resolve();
  }

  const key = getKey(uuid);
  const trx = redisClient.multi();

  trx.watch(key);

  return redisClient.hgetallAsync(key).then(lastThrottlesByActionType => {
    const hashPrevious = getHashPrevious(actionType);
    const timePrevious = _.get(lastThrottlesByActionType, hashPrevious, 'null');

    return timePrevious === 'null'
      ? trx.hdel(key, actionType)
        .execAsync()
      : trx.hmset(key, actionType, timePrevious)
        .hmset(key, hashPrevious, null)
        .execAsync();
  });
}

export {
  initialize,
  canDoAction,
  executeAction,
  rollbackAction,
};
