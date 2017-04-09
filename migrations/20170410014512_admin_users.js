
exports.up = function(knex, Promise) {
  return knex.schema.createTable('admins', function(table) {
    table.increments('id').primary().index();

    table.string('username').notNullable();
    table.string('password').notNullable();
    table.enu('role', ['tampere', 'otaniemi', 'root']).notNullable();
    table.string('description');

    table.unique('username');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('admins');
};
