#!/usr/bin/env node
import BPromise from 'bluebird';
import * as biasCore from '../core/bias-core';
const {knex} = require('../util/database').connect();
const logger = require('../util/logger')(__filename);


_updateBiases()
.then(() => {
  logger.info('Biases updated');
  process.exit();
})
.catch(err => {
  logger.error('Updating biases errored', err);
  process.exit(1);
});

function _updateBiases() {
  logger.info('Beginning bias update');
  return knex('votes').select(['votes.user_id', 'users.team_id'])
    .innerJoin('feed_items', 'feed_items.id', 'votes.feed_item_id')
    .innerJoin('users', 'users.id', 'feed_items.user_id')
    .groupBy(['votes.user_id', 'users.team_id'])
    .orderBy('votes.user_id')
    .then(rows => BPromise.each(rows, row =>
      biasCore.calculateBias({
        userId: row.user_id,
        teamId: row.team_id,
      })
      .then(() => {
        logger.info('Row updated');
      })
    ));
}
