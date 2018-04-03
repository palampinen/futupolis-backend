exports.up = function(knex, Promise) {
  return knex.schema.table('comments', function(table) {
    table.string('image_path');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('comments', function(table) {
    table.dropColumn('image_path');
  });
};
