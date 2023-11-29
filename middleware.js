const { articleSchema } = require('./schemas');
const ExpressError = require('./utils/ExpressError');
const admin = require('firebase-admin');

module.exports.validateArticle = (req, res, next) => {
  const { error } = articleSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

module.exports.authenticateMiddleware = (req, res, next) => {
  const sessionCookie = req.cookies.session || '';

  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then((userData) => {
      req.userData = userData;
      next();
    })
    .catch(() => {
      res.status(401).json({
        message: 'Unauthorized',
      });
    });
};
