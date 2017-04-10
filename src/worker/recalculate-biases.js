#!/usr/bin/env node
import BPromise from 'bluebird';
import _ from 'lodash';
import * as biasCore from '../core/bias-core';
const {knex} = require('../util/database').connect();
const logger = require('../util/logger')(__filename);

let teams;

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

  return knex('teams').select('id').then(results => {
    teams = results;

    return knex('users').select('id');
  })
  .then(users => BPromise.each(users, user =>
    BPromise.each(teams, team =>
      biasCore.calculateBias({
        userId: user.id,
        teamId: team.id,
      })
      .then(() => {
        logger.info('Row updated');
      })
    )
  ));
}
