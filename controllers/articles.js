const Firestore = require('@google-cloud/firestore');
const serviceAccount = require('../serviceAccountStuntcare.json');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './serviceAccountStuntcare.json',
});

const articleCollection = db.collection('articles');

module.exports.index = async (req, res) => {
  const articleDoc = await articleCollection.get();
  const articles = articleDoc.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // add filter feature

  if (!articles.length) {
    return res.status(404).json({
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
};

// POST /articles
module.exports.createArticle = async (req, res) => {
  const { title, description, imgUrl } = req.body;
  let likes = 0;
  const createdAt = new Date().toISOString();
  const localCreatedAt = new Date(createdAt).toLocaleString();
  const author = 'dr. afrizal'; // soon update reference to doctor.name

  const newArticle = {
    ...req.body,
    likes: likes,
    localCreatedAt,
    author,
  };

  const response = await articleCollection.add(newArticle);
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
};

module.exports.showArticle = async (req, res) => {
  const { id } = req.params;
  const articleDoc = articleCollection.doc(id);
  const article = await articleDoc.get();

  if (!article.exists) {
    return res.status(404).json({
      message: 'Article not found',
      data: null,
    });
  }

  res.status(200).json({
    message: 'Article data received successfully',
    data: {
      id: article.id,
      ...article.data(),
    },
  });
};

module.exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const articleDoc = articleCollection.doc(id);
  const article = await articleDoc.get();

  if (!article.exists) {
    return res.status(404).json({
      message: 'Article not found',
      data: null,
    });
  }

  const { title, description, imgUrl } = req.body;
  const updatedAt = new Date().toISOString();
  const localUpdatedAt = new Date(updatedAt).toLocaleString();

  const updateData = {
    title: title,
    description: description,
    localUpdatedAt,
  };

  if (imgUrl !== undefined) {
    updateData.imgUrl = imgUrl;
  }

  await articleDoc.update(updateData);

  const updatedArticle = await articleDoc.get();

  res.status(200).json({
    message: 'Article update successfully',
    data: {
      id: updatedArticle.id,
      ...updatedArticle.data(),
    },
  });
};

module.exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const articleDoc = articleCollection.doc(id);
    const article = await articleDoc.get();

    if (!article.exists) {
      return res.status(404).json({
        message: 'Delete failed, article not found',
        data: null,
      });
    }

    await articleDoc.delete();

    res.status(200).json({
      message: 'Article deleted successfully',
      data: {
        id: article.id,
        ...article.data(),
      },
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
