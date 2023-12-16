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
module.exports.verifyToken = async (req, res) => {
  const idToken = req.body.idToken;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Token is valid, and you can get user information from decodedToken
    res.status(200).json({ success: true, user: decodedToken });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
