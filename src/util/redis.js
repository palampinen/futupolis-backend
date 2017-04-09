const logger = require('../util/logger')(__filename);
const BPromise = require('bluebird');
const redis = require('redis');

BPromise.promisifyAll(redis.RedisClient.prototype);
BPromise.promisifyAll(redis.Multi.prototype);

const requireEnvs = require('./require-envs');
requireEnvs(['REDIS_URL']);

let client = null;

function connect() {
  if (client === null) {
    client = redis.createClient(process.env.REDIS_URL);
  }

  function close(cb) {
    cb = cb || function() {};

    logger.info('Closing redis connection ..');
    client.quitAsync()
      .finally(err => {
        logger.info('Redis connection destroyed');
        cb(err);
      });
  }

  return {
    client: client,
    close: close
  };
}

module.exports = {
  connect: connect
};
