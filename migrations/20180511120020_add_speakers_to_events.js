exports.up = function(knex, Promise) {
  return knex.schema.table('events', function(table) {
    table.json('speakers');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('events', function(table) {
    table.dropColumn('speakers');
  });
};
