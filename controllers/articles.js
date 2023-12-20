const Firestore = require('@google-cloud/firestore');
const serviceAccount = require('../serviceAccountStuntcare.json');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './serviceAccountStuntcare.json',
});

const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: 'capstone-project-stuntcare',
  keyFilename: './storageServiceAccount.json',
});

const bucket = storage.bucket('bucket-capstone-project-stuntcare');

const articleCollection = db.collection('articles');
const parentCollection = db.collection('parents');

module.exports.index = async (req, res) => {
  const articleDoc = await articleCollection.get();

  if (articleDoc.empty) {
    return res.status(404).json({
      message: 'Articles is still empty',
      data: {
        articles: [],
      },
    });
  }

  const articles = articleDoc.docs.map((doc) => {
    const articleData = doc.data();

    return {
      id: doc.id,
      ...articleData,
      author_id: articleData.author_id.id,
    };
  });

  res.status(200).json({
    error: 'false',
    message: 'Articles data received successfully',
    data: {
      articles,
    },
  });
};

// POST /articles
module.exports.createArticle = async (req, res) => {
  const { id } = req.params;
  const parentDoc = await parentCollection.doc(id).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Parent not found',
    });
  }

  const { title, description } = req.body;
  let likes = 0;
  const createdAt = Date.now();
  const author = parentDoc.data().name || 'Unknown';

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageType = req.file ? req.file.mimetype.split('/')[1] : null;

  const newArticle = {
    title,
    description,
    likes,
    createdAt,
    author,
    author_id: parentCollection.doc(id),
  };

  const response = await articleCollection.add(newArticle);
  const articleId = response.id;

  // Upload image to Cloud Storage if provided
  if (imageBuffer) {
    const fileName = `${id}_${articleId}_article_image.${imageType}`;
    const file = bucket.file(fileName);
    const stream = file.createWriteStream();

    stream.on('error', (uploadError) => {
      res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      // Update article document with image_url
      await articleCollection.doc(articleId).update({
        ...newArticle,
        image_url: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
      });

      res.status(201).json({
        message: 'Article successfully created',
      });
    });

    stream.end(imageBuffer);
  } else {
    // If no image provided, update article document without imgUrl
    await articleCollection.doc(articleId).update(newArticle);

    res.status(201).json({
      message: 'Article successfully created',
    });
  }
};

module.exports.showArticle = async (req, res) => {
  const { id } = req.params;
  const articleDoc = articleCollection.doc(id);
  const article = await articleDoc.get();

  if (!article.exists) {
    return res.status(404).json({
      message: 'Article not found',
    });
  }

  const articleData = article.data();
  const authorId = articleData.author_id.id;

  res.status(200).json({
    message: 'Article data received successfully',
    data: {
      id: article.id,
      ...articleData,
      author_id: authorId,
    },
  });
};

module.exports.updateArticle = async (req, res) => {
  const { userId, id } = req.params;
  const articleDoc = articleCollection.doc(id);
  const article = await articleDoc.get();
  const parentDoc = parentCollection.doc(userId);
  const parent = await parentDoc.get();

  if (!parent.exists) {
    return res.status(404).json({
      message: 'User not found',
      data: null,
    });
  }

  if (!article.exists) {
    return res.status(404).json({
      message: 'Article not found',
      data: null,
    });
  }

  const existingArticleData = article.data();

  const { title, description } = req.body;

  const updateData = {
    title: title || existingArticleData.title,
    description: description || existingArticleData.description,
  };

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageType = req.file ? req.file.mimetype.split('/')[1] : null;

  if (imageBuffer) {
    const fileName = `${userId}_${id}_article_image.${imageType}`;
    const file = bucket.file(fileName);
    const stream = file.createWriteStream();

    stream.on('error', (uploadError) => {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      updateData.image_url = imageUrl;

      // Update article document with new data including image_url
      await articleDoc.update(updateData);

      res.status(200).json({
        message: 'Article updated successfully with new image',
        data: {
          id: article.id,
          ...updateData,
        },
      });
    });

    stream.end(imageBuffer);
  } else {
    // If no new image is provided
    await articleDoc.update(updateData);

    res.status(200).json({
      error: false,
      message: 'Article updated successfully without changing the image',
    });
  }
};

module.exports.deleteArticle = async (req, res) => {
  const { userId, id } = req.params;
  const articleDoc = articleCollection.doc(id);
  const article = await articleDoc.get();
  const parentDoc = parentCollection.doc(userId);
  const parent = await parentDoc.get();

  if (!parent.exists) {
    return res.status(404).json({
      message: 'Delete failed, user not found',
      data: null,
    });
  }

  if (!article.exists) {
    return res.status(404).json({
      message: 'Delete failed, article not found',
      data: null,
    });
  }

  // Get the image URL from the article data
  const imageUrl = article.data().image_url;

  // Delete the article document
  await articleDoc.delete();

  // Delete the image from Cloud Storage if it exists
  if (imageUrl) {
    const fileName = imageUrl.split('/').pop();
    const file = bucket.file(fileName);

    await file.delete();
  }

  res.status(200).json({
    message: 'Article deleted successfully',
    data: {
      id: article.id,
      ...article.data(),
    },
  });
};
