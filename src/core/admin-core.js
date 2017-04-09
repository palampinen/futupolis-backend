import bcrypt from 'bcrypt';
import BPromise from 'bluebird';
import _ from 'lodash';

const { knex } = require('../util/database').connect();

export function getUserById(id) {
  return knex('admins')
    .select('id', 'username', 'role', 'description')
    .where('id', id)
    .then((result) => {
      if (result.length === 0) {
        return null;
      }

      return result[0];
    });
}

export function getUserByCredentials(username, password) {
  return knex('admins')
    .select()
    .where('username', username)
    .then((result) => {
      if (result.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }

      return BPromise.all([result[0], bcrypt.compare(password, result[0].password)]);
    })
    .then(([user, isPasswordCorrect]) => {
      if (!isPasswordCorrect) {
        return null;
      }

      // Don't return hashed password
      delete user.password;
      return user;
    })
    .catch((e) => {
      // If error is due to user not being found, return null.
      // Otherwise re-throw
      if (e.statusCode === 404) {
        return null;
      }

      throw e;
    });
}

export function toggleBanned(userId, adminRole) {
  return knex('users')
    .select('id', 'is_banned')
    .where({ id: userId })
    .modify((queryBuilder) => {
      // Root admins can ban any user they want, other roles are limited
      // to users in their respective cities
      if (adminRole === 'root') {
        return;
      }

      queryBuilder.innerJoin('teams', 'users.team_id', 'teams.id')
        .innerJoin('cities', 'teams.city_id', 'city.id')
        .andWhere('cities.name', _.startCase(adminRole));
    })
    .then((result) => {
      if (result.length === 0) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
      }

      return knex('users')
        .where('id', result[0].id)
        .update('is_banned', !result[0].is_banned, ['id', 'is_banned']);
    })
    .then(result => result[0]);
}

export function deleteFeedItem(itemId, adminRole) {
  return knex('feed_items')
    .where('id', itemId)
    .delete()
    .modify((queryBuilder) => {
      // Root admins can remove any feed items they want, other roles
      // are limited to feed items in their respective feeds
      if (adminRole === 'root') {
        return;
      }

      queryBuilder.innerJoin('cities', 'feed_items.city_id', 'city.id')
        .andWhere('city.name', _.startCase(adminRole));
    })
    .then((deleteCount) => {
      if (deleteCount !== 1) {
        const err = new Error('Feed item not found');
        err.status = 404;
        throw err;
      }

      return;
    });
}
