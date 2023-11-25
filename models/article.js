const mongoose = require('mongoose');
const { Schema } = mongoose;

const ArticleSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
  },
  // img,
  // likes,
  // comment,
  // creator,
  // createdAt,
});

module.exports = mongoose.model('Article', ArticleSchema);
