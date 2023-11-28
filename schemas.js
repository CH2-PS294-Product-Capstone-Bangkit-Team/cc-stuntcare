const Joi = require('joi');

module.exports.articleSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  imgUrl: Joi.string(),
});
