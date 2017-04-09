function requireAuthenticatedSession(req, res, next) {
  // Session authenticated user
  if (req.user) {
    return next();
  }

  var err = new Error('Invalid API token in x-token header.');
  err.status = 401;
  return next(err);
};

module.exports = requireAuthenticatedSession;
