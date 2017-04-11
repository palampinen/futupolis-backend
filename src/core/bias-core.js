import _ from 'lodash';
const {knex} = require('../util/database').connect();


const calculateBias = (opts) => {
  const wilsonsSql = `
    SELECT
      wilsons(
        COUNT(CASE votes.value WHEN 1 THEN 1 ELSE null END)::numeric,
        COUNT(CASE votes.value WHEN -1 THEN 1 ELSE null END)::numeric
      )
    FROM votes
    LEFT JOIN feed_items ON feed_items.id = votes.feed_item_id
    LEFT JOIN users ON users.id = feed_items.user_id
    LEFT JOIN teams ON teams.id = users.team_id
    WHERE votes.user_id = ? AND teams.id = ?
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
      return _.get(results, 'rows[0].wilsons', 0);
    })
    .then(bias => {
      const upsertParams = [
        bias, opts.userId, opts.teamId,
        bias, opts.userId, opts.teamId,
      ];

      return trx.raw(upsertSql, upsertParams);
    })
};

export {
  calculateBias,
};
