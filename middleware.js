const { articleSchema } = require('./schemas');
const ExpressError = require('./utils/ExpressError');

module.exports.validateArticle = (req, res, next) => {
  const { error } = articleSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};
