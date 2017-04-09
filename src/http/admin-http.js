import {createJsonRoute} from '../util/express';
import {assert} from '../validation';
import * as adminCore from '../core/admin-core';
import BPromise from 'bluebird';

const login = createJsonRoute((req, res) => {
  return req.user;
});

const logout = createJsonRoute((req, res) => {
  req.logout();
  return;
});

const banUser = createJsonRoute((req, res) => {
  const params = assert({
    id: req.params.id
  }, 'adminParams');

  return adminCore.toggleBanned(params.id, req.user.role);
});

const deleteFeedItem = createJsonRoute((req, res) => {
  const params = assert({
    id: req.params.id
  }, 'adminParams');

  return adminCore.deleteFeedItem(params.id, req.user.role);
});

export {
  login,
  logout,
  banUser,
  deleteFeedItem
};
