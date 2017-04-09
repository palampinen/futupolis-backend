import passport from 'passport';
import session from 'express-session';
import * as adminCore from './core/admin-core.js';
import requireEnvs from './util/require-envs';

const RedisStore = require('connect-redis')(session);
const LocalStrategy = require('passport-local').Strategy;
const redis = require('./util/redis').connect().client;
const logger = require('./util/logger')(__filename);

// Maximum age of the session before users are required to re-authenticate
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE, 10);

requireEnvs(['SESSION_SECRET']);

export default function setupAuth(app) {
  app.use(session({
    cookie: {
      secure: process.env.HTTPS_ENABLED === 'true',
      maxAge: SESSION_MAX_AGE
    },
    saveUninitialized: false,
    resave: false,
    secret: process.env.SESSION_SECRET,
    store: new RedisStore({
      client: redis,
      prefix: 'session:'
    })
  }));

  passport.deserializeUser((id, done) => {
    adminCore.getUserById(id)
      .then((user) => {
        if (!user) {
          logger.error(`User not found during deserialization: ${user}`);
          return done(null, false);
        }

        return done(null, user);
      });
  });

  passport.serializeUser((user, done) => {
    if (!user) {
      logger.error(`User was undefined when serializing: ${user}`);
      return done(null, false);
    }

    return done(null, user.id);
  });

  passport.use(new LocalStrategy(function handleAuth(username, password, done) {
    adminCore.getUserByCredentials(username, password)
      .then((user) => {
        if (user) {
          return done(null, user);
        } else {
          logger.warn(`Failed login attempt for user ${username}`);
          return done(null, false);
        }
      });
  }));

  app.use(passport.initialize());
  app.use(passport.session());
}
