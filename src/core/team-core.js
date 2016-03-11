const {knex} = require('../util/database').connect();
import _ from 'lodash';
import {deepChangeKeyCase} from '../util';

function getTeams() {
  return knex.raw(`SELECT teams.id, teams.name, SUM(COALESCE(action_types.value, 0)) AS score
  FROM teams
  LEFT JOIN actions ON teams.id = actions.team_id
  LEFT JOIN action_types ON actions.type_id = action_types.id
  GROUP BY teams.id, teams.name
  ORDER BY score DESC, teams.id`)
  .then(result => {
      console.log(result.rows);
    return _.map(result.rows, row => deepChangeKeyCase(row, 'camelCase'));
  });
}

export {
  getTeams
};
