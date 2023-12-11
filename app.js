if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const port = process.env.PORT || 8080;
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./cc-stuntcare-demo-f23bdc5f608a.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const ExpressError = require('./utils/ExpressError');

const userRoutes = require('./routes/users');
const articleRoutes = require('./routes/articles');
const childRoutes = require('./routes/child');
const cookieParser = require('cookie-parser');
// const reviewRoutes = require('./routes/reviews');

const app = express();

app.engine('.html', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/', userRoutes);
app.use('/articles', articleRoutes);
app.use('/child', childRoutes);
// app.use('/campgrounds/:id/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.send('home');
});

app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found', 404));
});

app.use((err, req, res, next) => {
  const { status = 500, message = 'Something went wrong' } = err;
  if (!err.message) {
    err.message = 'Oh no, Something Went Wrong!';
  }
  res.status(status).json({ status, message });
});

app.listen(port, () => {
  console.log('Server run on ', port);
});
