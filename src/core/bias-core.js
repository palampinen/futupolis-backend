import _ from 'lodash';
import BPromise from 'bluebird';
const {knex} = require('../util/database').connect();

const calculateBias = (opts) => {
  const wilsonsSql = `
    SELECT
      wilsons(
        COUNT(CASE votes.value WHEN 1 THEN 1 ELSE null END)::int,
        COUNT(CASE votes.value WHEN -1 THEN -1 ELSE null END)::int
      )
    FROM votes
    LEFT JOIN feed_items ON feed_items.id = votes.feed_item_id
    LEFT JOIN users ON users.id = feed_items.user_id
    WHERE votes.user_id = ? AND users.team_id = ?
  `;

  const upsertSql = `
    WITH upsert AS
      (UPDATE voter_biases
      SET bias = ?
      WHERE user_id = ? AND team_id = ?
      RETURNING *
    ), inserted AS (
      INSERT INTO voter_biases(bias, user_id, team_id)
      SELECT ?, ?, ?
      WHERE NOT EXISTS( SELECT * FROM upsert )
      RETURNING *
    )
    SELECT *
    FROM upsert
    UNION ALL
    SELECT *
    FROM inserted;
  `;

  const trx = opts.trx || knex;
  const wilsonsParams = [
    opts.userId,
    opts.teamId,
  ];

  return trx.raw(wilsonsSql, wilsonsParams)
    .then(results => {
      const wilsons = _.get(results, 'rows[0].wilsons', null);
      return _biasCoefficient(wilsons);
    })
    .then(bias => {
      const upsertParams = [
        bias, opts.userId, opts.teamId,
        bias, opts.userId, opts.teamId,
      ];

      return trx.raw(upsertSql, upsertParams);
    })
};

const _biasCoefficient = wilsons => BPromise.resolve(wilsons
  ? 1 - Math.abs(wilsons - 0.5) / 0.5
  : 0
);

export {
  calculateBias,
};
