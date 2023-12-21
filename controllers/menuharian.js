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

const childCollection = db.collection('child');
const dailyFoodCollection = db.collection('daily_food');

module.exports.index = async (req, res) => {
  const { userId, id } = req.params;

  const foodDoc = await dailyFoodCollection
    .where('children_id', '==', childCollection.doc(id))
    .get();

  const food = foodDoc.docs.map((doc) => {
    const foodData = doc.data();

    return {
      ...foodData,
      children_id: id,
    };
  });

  if (food.length === 0) {
    return res.status(404).json({
      error: true,
      message: 'Catatan harian belum diisi',
    });
  }

  res.status(200).json({
    message: 'Daily food menu data received successfully',
    data: {
      food,
    },
  });
};

module.exports.createFood = async (req, res) => {
  const { userId, id } = req.params;
  const childDoc = childCollection.doc(id);

  const childSnapshot = await childDoc.get();

  if (!childSnapshot.exists) {
    return res.status(404).json({
      error: true,
      message: 'Child not found',
    });
  }

  const { schedule, food_name } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageType = req.file ? req.file.mimetype.split('/')[1] : null;

  const fileName = imageBuffer
    ? `${userId}_${id}_${Date.now()}_food_image.${imageType}`
    : null;

  const file = fileName ? bucket.file(fileName) : null;
  const stream = file ? file.createWriteStream() : null;

  const imageUrl = fileName
    ? `https://storage.googleapis.com/${bucket.name}/${fileName}`
    : null;

  const newFoodEntry = {
    schedule,
    food_name,
    children_id: childDoc,
    created_at: Date.now(),
    image_url: imageUrl,
  };

  const foodResponse = await dailyFoodCollection.add(newFoodEntry);
  const foodId = foodResponse.id;

  if (imageBuffer && file && stream) {
    stream.on('error', (uploadError) => {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      await dailyFoodCollection.doc(foodId).update({
        ...newFoodEntry,
        image_url: imageUrl,
      });

      res.status(201).json({
        error: false,
        message: 'Daily food menu entry created successfully',
        data: {
          id: foodId,
          ...newFoodEntry,
        },
      });
    });

    stream.end(imageBuffer);
  } else {
    await dailyFoodCollection.doc(foodId).update(newFoodEntry);

    res.status(201).json({
      error: false,
      message: 'Daily food menu entry created successfully without image',
    });
  }
};
