import express from 'express';
import passport from 'passport';
import requireClientHeaders from './middleware/require-client-headers';
import requireAuthenticatedSession from './middleware/require-authenticated-session';
import * as eventHttp from './http/event-http';
import * as actionHttp from './http/action-http';
import * as teamHttp from './http/team-http';
import * as userHttp from './http/user-http';
import * as actionTypeHttp from './http/action-type-http';
import * as feedHttp from './http/feed-http';
import * as announcementHttp from './http/announcement-http';
import * as voteHttp from './http/vote-http';
import * as markerHttp from './http/marker-http';
import * as citiesHttp from './http/cities-http';
import * as radioHttp from './http/radio-http';
import * as wappuMood from './http/wappu-mood-http';
import * as imageHttp from './http/image-http';
import * as adminHttp from './http/admin-http';


function createRouter() {
  const router = express.Router();

  // Session based authentication
  router.post(
    '/login',
    passport.authenticate('local'),
    adminHttp.login
  );
  router.post(
    '/logout',
    adminHttp.logout
  );

  router.put(
    '/admin/users/:id/ban',
    requireAuthenticatedSession,
    adminHttp.banUser
  );

  router.delete(
    '/admin/feed/:id',
    requireAuthenticatedSession,
    adminHttp.deleteFeedItem
  );

  router.get(
    '/events',
    requireClientHeaders(),
    eventHttp.getEvents
  );
  router.get(
    '/events/:id',
    requireClientHeaders(),
    eventHttp.getEvents
  );

  router.post(
    '/actions',
    requireClientHeaders(),
    actionHttp.postAction
  );
  router.get(
    '/teams',
    requireClientHeaders(),
    teamHttp.getTeams
  );

  router.get(
    '/image/:id',
    imageHttp.getImage
  );

  router.put(
    '/users/:uuid',
    requireClientHeaders(),
    userHttp.putUser
  );
  router.get(
    '/users/:uuid',
    requireClientHeaders(),
    userHttp.getUser
  );

  router.get(
    '/action_types',
    requireClientHeaders(),
    actionTypeHttp.getActionTypes
  );

  router.get(
    '/feed',
    requireClientHeaders(),
    feedHttp.getFeed
  );
  router.delete(
    '/feed/:id',
    requireClientHeaders(),
    feedHttp.deleteFeedItem
  );

  router.get(
    '/announcements',
    requireClientHeaders(),
    announcementHttp.getAnnouncements
  );

  router.get(
    '/markers',
    requireClientHeaders(),
    markerHttp.getMarkers
  );

  router.get(
    '/cities',
    requireClientHeaders(),
    citiesHttp.getCities
  );

  router.put(
    '/vote',
    requireClientHeaders(),
    voteHttp.putVote
  );

  router.get(
    '/radio',
    requireClientHeaders(),
    radioHttp.getStations
  );
  router.get(
    '/radio/:id',
    requireClientHeaders(),
    radioHttp.getStation
  );

  router.put(
    '/mood',
    requireClientHeaders(),
    wappuMood.putMood
  );
  router.get(
    '/mood',
    requireClientHeaders(),
    wappuMood.getMood
  );

  return router;
}

export default createRouter;
