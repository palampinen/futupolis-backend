import _ from 'lodash';
import BPromise from 'bluebird';
const {knex} = require('../util/database').connect();
const redisClient = require('../util/redis').connect().client;
import {deepChangeKeyCase} from '../util';


const KEY_TEAMS = 'teams';
const KEY_IS_STALE = 'teamsAreStale';

function initialize() {
  redisClient.getAsync(KEY_IS_STALE).then(isStale => {
    const stale = isStale === null || isStale;
    return stale
      ? _updateCache()
      : BPromise.resolve();
  })
}

function _getField(cityId) {
  return `city_${ !cityId ? 'all' : cityId }`;
}

function getTeams(opts) {
  return redisClient.hgetAsync(KEY_TEAMS, _getField(opts.city)).then(result => {
    return JSON.parse(result);
  });
}

const _updateCache = BPromise.promisify(() => {
  return knex('cities').select('*')
    .then(cities => BPromise.map(cities, city =>
      _getTeams(city.id).then(teams => redisClient.hmsetAsync(KEY_TEAMS, _getField(city.id), JSON.stringify(teams)))
    ))
    .then(() =>
      _getTeams().then(teams => redisClient.hmsetAsync(KEY_TEAMS, _getField(), JSON.stringify(teams)))
    );
});

function _getTeams(city) {
  const voteScoreSql = `
    (SELECT
      team_id,
      SUM(value) AS value
    FROM
      (SELECT
        wilsons(
          SUM(CASE votes.value WHEN 1 THEN (1 - voter_biases.bias) ELSE null END)::numeric,
          SUM(CASE votes.value WHEN -1 THEN voter_biases.bias ELSE null END)::numeric
        ) AS value,
        users.team_id AS team_id
      FROM (
        SELECT feed_items.*
        FROM feed_items
        JOIN users ON users.id = feed_items.user_id AND NOT users.is_banned
      ) feed_items
      JOIN users ON users.id = feed_items.user_id
      LEFT JOIN votes ON votes.feed_item_id = feed_items.id
      JOIN voter_biases ON voter_biases.user_id = votes.user_id AND voter_biases.team_id = users.team_id
      GROUP BY feed_items.id, users.team_id
    ) AS sub_query
    GROUP BY team_id)
  `;

  const actionScoreSql = `
    (SELECT
      SUM(COALESCE(action_types.value, 0)) AS value,
      teams.id AS team_id
    FROM teams
    LEFT JOIN actions ON teams.id = actions.team_id AND NOT actions.is_banned
    LEFT JOIN action_types ON actions.action_type_id = action_types.id
    LEFT JOIN users ON users.id = actions.user_id AND NOT users.is_banned
    GROUP BY teams.id)
  `;

  let sqlString = `
    SELECT
      teams.id AS id,
      teams.name AS name,
      teams.image_path AS image_path,
      (COALESCE(actions_score.value, 0) + COALESCE(vote_score.value, 0))::int AS score,
      teams.city_id AS city
    FROM teams
    LEFT JOIN ${ actionScoreSql } actions_score ON actions_score.team_id = teams.id
    LEFT JOIN ${ voteScoreSql } vote_score ON vote_score.team_id = actions_score.team_id
  `;

  let params = [];
  let whereClauses = [];

  if (city) {
    whereClauses.push('teams.city_id = ?');
    params.push(city);
  }

  if (whereClauses.length > 0) {
    sqlString += ` WHERE ${ whereClauses.join(' AND ')}`;
  }

  sqlString += `
    GROUP BY id, name, image_path, city, actions_score.value, vote_score.value
    ORDER BY score DESC, id
  `;

  return knex.raw(sqlString, params)
  .then(result => {
    return _.map(result.rows, row => deepChangeKeyCase(row, 'camelCase'));
  });
}

export {
  initialize,
  getTeams,
};
