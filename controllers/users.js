const admin = require('firebase-admin');

module.exports.register = async (req, res, next) => {
  const { email, password } = req.body;
  const userRecord = await admin.auth().createUser({
    email: email,
    password: password,
  });

  res.status(200).json({
    success: true,
    message: 'Registration successful!',
    user: userRecord.toJSON(),
  });
};

module.exports.renderLogin = (req, res) => {
  res.render('login.html');
};

module.exports.login = async (req, res) => {
  const idToken = req.body.idToken.toString();

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        console.log('login success', idToken);
        const options = { maxAge: expiresIn, httpOnly: true };
        res.cookie('session', sessionCookie, options);
        res.end(JSON.stringify({ status: 'success' }));
      },
      (error) => {
        res.status(401).send('UNAUTHORIZED REQUEST!');
      }
    );
};

module.exports.logout = (req, res, next) => {
  try {
    res.clearCookie('session');
    res.status(200).json({
      success: true,
      message: 'Logout successful!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout.',
    });
  }
};
