if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const port = process.env.PORT || 8080;
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountStuntcare.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const multer = require('multer');
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const ExpressError = require('./utils/ExpressError');

const userRoutes = require('./routes/users');
const articleRoutes = require('./routes/articles');
const childRoutes = require('./routes/child');
const doctorRoutes = require('./routes/doctors');
const cookieParser = require('cookie-parser');

const app = express();

app.engine('.html', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(upload.single('image'));

app.use('/', userRoutes);
app.use('/doctor', doctorRoutes);
app.use('/article', articleRoutes);
// app.use('/user/:userId/articles', articleRoutes);
app.use('/user/:userId/child', childRoutes);

app.get('/', (req, res) => {
  res.send('home');
});

app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found', 404));
});

app.use((err, req, res, next) => {
  const { status = 500, message = 'Something went wrong', stack } = err;
  if (!err.message) {
    err.message = 'Oh no, Something Went Wrong!';
  }
  res.status(status).json({ error: true, message, stack });
});

app.listen(port, () => {
  console.log('Server run on ', port);
});
