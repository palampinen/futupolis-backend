// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

const _ = require('lodash');
const requireEnvs = require('./require-envs');
const request = require('request');
const FB = require('fb');
const logger = require('./logger')(__filename);
const eventCore = require('../core/event-core');
const {knex} = require('./database').connect();

requireEnvs(['FB_APP_ID', 'FB_APP_SECRET']);

const ACCOUNTS_TO_FOLLOW = _parseEnvVar() || [{ id: 'retrowappu2015', city: 'Tampere' }];
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 min
const FB_CFG = {
  appId:     process.env.FB_APP_ID,
  appSecret: process.env.FB_APP_SECRET,
  toFollow:  ACCOUNTS_TO_FOLLOW,
  xfbml:     true,
  version:   'v2.5'
};
FB.options(FB_CFG);

// # State
const state = {
  accessToken: null,
  announcements: null,
  eventIds: []
};

function initialize() {
  knex('events')
    .select('fb_event_id AS facebookId')
    .whereNotNull('fb_event_id')
    .then(events => {
      state.eventIds = events.map(event => event.facebookId);

      _getAccessToken()
        .then(() => {
          setInterval(_updateFromFacebook, REFRESH_INTERVAL);
          // Execute update immediately
          _updateFromFacebook();
      });
  })
}

function getAnnouncements(cityName) {
  return _.get(state, `announcements[${cityName}]`);
}

function _updateFromFacebook() {
  logger.info('Updating FB data');

  FB.setAccessToken(state.accessToken);

  const promises = state.eventIds
    .map(_fetchAttending)
    .concat(_fetchAnnouncements());

  return Promise.all(promises)
    .then(() => logger.info('Facebook update performed'))
    .catch(error => logger.error('Facebook info could not be updated', error));
}

function _fetchAttending(eventId) {
  return new Promise((resolve, reject) => {

    FB.api(`/${ eventId }/?fields=attending_count`,
      function(response) {
        if (response && !response.error) {
          logger.info(`Attending count fetched for ${ eventId }`);

          const attendingCount = response.attending_count;
          eventCore.setAttendingCount(eventId, attendingCount)
            .catch(error => {
              logger.error('Failed to update attending count:', error);
            })
            .then(resolve);
        } else {
          logger.error('Failed to fetch event attending:', response);
          resolve();
        }
      }
    );
  });
}

function _fetchAnnouncements() {
  return new Promise((resolve, reject) => {
    _.forEach(ACCOUNTS_TO_FOLLOW, account => {
      FB.api(`/${ account.id }/feed?fields=message,created_time,full_picture`,
        function(response) {
          if (response && !response.error) {
            logger.info('Announcements fetched');
            const announcements = response.data
              .filter(x => !_.isUndefined(x.message))
              .map(x => {
                return {
                  message: x.message,
                  created_time: x.created_time,
                  picture: x.full_picture
                };
              });

            _.set(state, ['announcements', account.city], announcements);
          } else {
            logger.error('Failed to fetch announcements:', response);
          }
        }
      );
    });

    resolve();
  });
}

function _getAccessToken() {
  return new Promise(function(resolve, reject) {
    request.get('https://graph.facebook.com/oauth/access_token?' +
      'client_id=' + FB_CFG.appId +
      '&client_secret=' + FB_CFG.appSecret +
      '&grant_type=client_credentials',

      function(error, response, body) {
        if (!body) {
          logger.error('No body in response');
          return reject(body.error);
        }
        else if (body.error) {
          console.error('Error occured on Facebook Access Token fetch', body.error);
          return reject(body.error);
        }
        else {
          state.accessToken = _parseAccessTokenFromBody(body);
          logger.info('FB Access Token retrieved');
          return resolve(_extendTokenDuration(state.accessToken));
        }
      }
    );
  });
};

function _extendTokenDuration() {
  return new Promise(function(resolve, reject) {
    request.get('https://graph.facebook.com/oauth/access_token?' +
      'client_id=' + FB_CFG.appId +
      '&client_secret=' + FB_CFG.appSecret +
      '&grant_type=client_credentials' +
      '&access_token=' + state.accessToken +
      '&fb_exchange_token=' + state.accessToken +
      '&redirect_uri=https://wappuapp-heroku.com', // unused but required
      function(error, response, body) {
        if (!body) {
          logger.error('No body in response');
          return reject(body.error);
        }
        else if (body.error) {
          logger.error('Error occured on Facebook Access Token extension', body.error);
          return reject(body.error);
        }
        else {
          logger.info('FB Access Token extended');
          state.accessToken = _parseAccessTokenFromBody(body);
          return resolve(state.accessToken);
        }
      }
    );
  });
}

function _parseAccessTokenFromBody(body) {
  return JSON.parse(body).access_token;
}

function _parseEnvVar() {
  if (!process.env.FB_ACCOUNTS_TO_FOLLOW) {
    logger.info('Env var FB_ACCOUNTS_TO_FOLLOW not set');
    return undefined;
  }

  try {
    return JSON.parse(process.env.FB_ACCOUNTS_TO_FOLLOW);
  } catch (err) {
    logger.error('Error parsing env variable FB_ACCOUNTS_TO_FOLLOW', err);
    return undefined;
  }
}

export {
  initialize,
  getAnnouncements
};
