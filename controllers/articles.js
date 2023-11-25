const admin = require('firebase-admin');
const serviceAccount = require('../cc-stuntcare-demo-f23bdc5f608a.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const Firestore = require('@google-cloud/firestore');
const { Timestamp } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './cc-stuntcare-demo-f23bdc5f608a.json',
});

module.exports.index = async (req, res) => {
  try {
    const articleDoc = await db.collection('articles').get();
    const articles = articleDoc.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // add filter feature

    if (!articles.length) {
      res.status(404).json({
        message: 'Articles is still empty',
        data: {
          articles,
        },
      });
    }

    res.status(200).json({
      message: 'Articles data received successfully',
      data: {
        articles,
      },
    });
  } catch (error) {
    console.error('Error retrieving articles:', error);
    res.status(500).json({ status: 'error', error: 'Internal Server Error' });
  }
};

// POST /articles
module.exports.createArticle = async (req, res) => {
  try {
    const { title, description } = req.body;

    const newArticle = {
      ...req.body,
      ownerId: 'reffromdoctor',
      ownerName: 'dr. afrizal',
      createdAt: Timestamp.now().toDate(),
      imgUrl: 'urlfromstorage',
    };

    // ADD CONDITIONAL IF SUCCESS IF ID EXISTS ETC.

    const response = await db.collection('articles').add(newArticle);
    const articleId = response.id;
    res.status(201).json({
      message: 'Articles successfully created',
      data: {
        article: {
          id: articleId,
          ...newArticle,
        },
      },
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports.showArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const articleRef = db.collection('articles').doc(id);

    // Mendapatkan data dari dokumen
    const articleDoc = await articleRef.get();

    // Memeriksa apakah dokumen ada
    if (!articleDoc.exists) {
      return res.status(404).json({
        message: 'Article not found',
        data: null,
      });
    }

    // Mengirimkan data dokumen sebagai respons
    res.status(200).json({
      message: 'Article data received successfully',
      data: {
        id: articleDoc.id,
        ...articleDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error retrieving article:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const articleRef = db.collection('articles').doc(id);

  if (!articleDoc.exists) {
    return res.status(404).json({
      message: 'Article not found',
      data: null,
    });
  }

  const { title, description } = req.body;
  await articleRef.update({
    title: title,
  });

  res.status(200).json({
    message: 'Article update successfully',
    // data: {
    //   id: articleRef.id,
    //   ...articleRef.data(),
    // },
  });
};

module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  const articleRef = db.collection('articles').doc(id);

  // if exist delete, if not res 404
};
