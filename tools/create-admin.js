const bcrypt = require('bcrypt');
const knex = require('../src/util/database').connect().knex;
const argv = require('yargs')
      .usage('Usage: $0 -u <username> -p <password> -r <role>')
      .option('username', {
        alias: 'u',
        describe: 'username for the admin user'
      })
      .option('password', {
        alias: 'p',
        describe: 'password for the user. Will be hashed with bcrypt'
      })
      .option('role', {
        alias: 'r',
        describe: 'role for the admin. Root can moderate all feeds while otaniemi and tampere roles are restricted to their respective feeds',
        choies: ['tampere', 'otaniemi', 'root']
      })
      .demandOption(['username', 'password', 'role'])
      .string(['username', 'password', 'role'])
      .argv;

if (require.main === module) {
  bcrypt.hash(argv.password, 10)
    .then((hash) => knex('admins')
          .insert({
            username: argv.username,
            password: hash,
            role: argv.role
          }))
    .then(() => {
      console.log('Succesfully created new admin');
      process.exit(0);
    })
    .catch((e) => {
      console.log(`Failed to create new admin: ${e}`);
      process.exit(1);
    });
}
