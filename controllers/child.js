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
const growthCollection = db.collection('growth_history');
const parentCollection = db.collection('parents');

//          READ CHILDREN FROM ONE PARENT
module.exports.index = async (req, res) => {
  const { userId } = req.params;

  const childQuerySnapshot = await childCollection
    .where('parent_id', '==', parentCollection.doc(userId))
    .get();

  const child = childQuerySnapshot.docs.map((doc) => {
    const childData = doc.data();
    return {
      id: doc.id,
      name: childData.name,
      birth_day: childData.birth_day,
      gender: childData.gender,
      parent_id: userId,
      stunting_status: childData.stunting_status,
      bmi_status: childData.bmi_status,
      image_url: childData.image_url,
    };
  });

  res.status(200).json({
    message: 'Child data received successfully',
    data: {
      child,
    },
  });
};

module.exports.addChild = async (req, res) => {
  const { userId } = req.params;
  const parentDoc = await parentCollection.doc(userId).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Parent not found',
    });
  }

  const { name, gender, birth_day, birth_weight, birth_height } = req.body;
  const parsedWeight = parseFloat(birth_weight);
  const parsedHeight = parseFloat(birth_height);

  if (isNaN(parsedWeight) || isNaN(parsedHeight)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid weight or height format',
    });
  }

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageType = req.file ? req.file.mimetype.split('/')[1] : null;

  const childData = {
    parent_id: parentCollection.doc(userId),
    name,
    gender,
    birth_day,
    birth_weight: parsedWeight,
    birth_height: parsedHeight,
  };

  const childResponse = await childCollection.add(childData);
  const childId = childResponse.id;

  const fileName = imageBuffer
    ? `${userId}_${childId}_profile_image.${imageType}`
    : null;

  const file = fileName ? bucket.file(fileName) : null;
  const stream = file ? file.createWriteStream() : null;

  const imageUrl = fileName
    ? `https://storage.googleapis.com/${bucket.name}/${fileName}`
    : null;

  if (imageBuffer && file && stream) {
    stream.on('error', (uploadError) => {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      const growthHistoryData = {
        weight: parsedWeight,
        height: parsedHeight,
        created_at: Date.now(),
        children_id: childCollection.doc(childId),
      };

      await growthCollection.add(growthHistoryData);

      // Update child document with image_url
      await childCollection.doc(childId).update({
        image_url: imageUrl,
      });

      res.status(201).json({
        error: false,
        message: 'Child successfully created',
      });
    });

    stream.end(imageBuffer);
  } else {
    const growthHistoryData = {
      weight: parsedWeight,
      height: parsedHeight,
      created_at: Date.now(),
      children_id: childCollection.doc(childId),
    };

    await growthCollection.add(growthHistoryData);

    // Update child document without image_url
    await childCollection.doc(childId).update({
      image_url:
        'https://storage.googleapis.com/bucket-capstone-project-stuntcare/default-profile-image.jpg',
    });

    res.status(201).json({
      error: false,
      message: 'Child successfully created',
    });
  }
};

//          READ CHILD BY ID
module.exports.showChild = async (req, res) => {
  const { userId, id } = req.params;

  const parentDoc = await parentCollection.doc(userId).get();
  const childDoc = await childCollection.doc(id).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Parent not found',
    });
  }

  if (!childDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Child not found',
    });
  }

  const childData = childDoc.data();
  const childReference = childCollection.doc(id);

  const growthHistorySnapshot = await growthCollection
    .where('children_id', '==', childReference)
    .get();

  const growthHistoryData = growthHistorySnapshot.docs.map((doc) => {
    return {
      id: doc.id,
      weight: doc.data().weight,
      created_at: doc.data().created_at,
      children_id: doc.data().children_id.id,
      height: doc.data().height,
    };
  });

  res.status(200).json({
    message: 'Child data received successfully',
    data: {
      id: childDoc.id,
      parent_id: userId,
      name: childData.name,
      gender: childData.gender,
      birth_day: childData.birth_day,
      birth_height: childData.birth_height,
      birth_weight: childData.birth_weight,
      growth_history: growthHistoryData,
      stunting_status: childData.stunting_status,
      bmi_status: childData.bmi_status,
      food_recommendation: childData.food_recommendation || [],
      child_daily_menu: childData.child_daily_menu || [],
      image_url: childData.image_url,
    },
  });
};

//          UPDATE CHILD BY ID
module.exports.updateChild = async (req, res) => {
  const { userId, id } = req.params;
  const childDoc = childCollection.doc(id);
  const child = await childDoc.get();

  const parentDoc = await parentCollection.doc(userId).get();
  if (!parentDoc.exists && !child.exists) {
    return res.status(404).json({
      error: true,
      message: 'Update failed, parent or child not found',
    });
  }

  const existingChildData = child.data();

  const { weight, height, name } = req.body;
  const parsedWeight = parseFloat(weight);
  const parsedHeight = parseFloat(height);

  if (isNaN(parsedWeight) || isNaN(parsedHeight)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid weight or height format',
    });
  }

  const currentImageUrl = child.data().image_url;

  const growthHistoryData = {
    height: parsedHeight,
    weight: parsedWeight,
    created_at: Date.now(),
    children_id: childCollection.doc(id),
  };

  await growthCollection.add(growthHistoryData);

  const imageBuffer = req.file ? req.file.buffer : null;
  const imageType = req.file ? req.file.mimetype.split('/')[1] : null;

  const fileName = imageBuffer
    ? `${userId}_${id}_profile_image.${imageType}`
    : null;

  const file = fileName ? bucket.file(fileName) : null;
  const stream = file ? file.createWriteStream() : null;

  const imageUrl = fileName
    ? `https://storage.googleapis.com/${bucket.name}/${fileName}`
    : null;

  if (imageBuffer && file && stream) {
    stream.on('error', (uploadError) => {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      // Update child document with new data including image_url
      await childDoc.update({
        name: name || existingChildData.name,
        image_url: imageUrl,
      });

      res.status(200).json({
        error: false,
        message: 'Child updated successfully with new image',
      });
    });

    stream.end(imageBuffer);
  } else {
    // If no new image is provided
    await childDoc.update({
      name: name || existingChildData.name,
    });

    res.status(200).json({
      error: false,
      message: 'Child updated successfully without changing the image',
    });
  }
};

//          DELETE CHILD BY ID
module.exports.deleteChild = async (req, res) => {
  const { userId, id } = req.params;
  const childDoc = childCollection.doc(id);
  const child = await childDoc.get();

  const parentDoc = await parentCollection.doc(userId).get();
  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Delete failed, parent not found',
    });
  }
  if (!child.exists) {
    return res.status(404).json({
      error: true,
      message: 'Delete failed, child not found',
    });
  }

  const imageUrl = child.data().image_url;
  const defaultImageUrl =
    'https://storage.googleapis.com/bucket-capstone-project-stuntcare/default-profile-image.jpg';

  const growthHistoryQuerySnapshot = await growthCollection
    .where('children_id', '==', childDoc)
    .get();

  const deleteGrowthHistoryPromises = growthHistoryQuerySnapshot.docs.map(
    (doc) => doc.ref.delete()
  );

  await Promise.all(deleteGrowthHistoryPromises);

  await childDoc.delete();

  if (imageUrl && imageUrl !== defaultImageUrl) {
    const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
    const file = bucket.file(fileName);

    try {
      await file.delete();
    } catch (deleteError) {
      console.error(
        'Error deleting image from Google Cloud Storage:',
        deleteError
      );
    }
  }

  res.status(200).json({
    error: false,
    message: 'Child deleted successfully',
  });
};
