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

//          CREATE CHILD
module.exports.addChild = async (req, res) => {
  const { userId } = req.params;
  const parentDoc = await parentCollection.doc(userId).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Parent not found',
    });
  }

  const { name, gender, birth_day, birth_weight, birth_height, img_base64 } =
    req.body;

  const imageBuffer = Buffer.from(
    img_base64.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );

  const imageTypeMatch = img_base64.match(/^data:image\/(\w+);base64,/);
  const imageType = imageTypeMatch ? imageTypeMatch[1] : 'jpeg'; // Default to 'jpeg'

  const fileName = `${userId}_${Date.now()}_profile_image.${imageType}`;
  const file = bucket.file(fileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: `image/${imageType}`,
    },
  });

  stream.on('error', (uploadError) => {
    return res.status(500).json({
      error: true,
      message: 'Error uploading image to Google Cloud Storage',
    });
  });

  stream.on('finish', async () => {
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const childResponse = await childCollection.add({
      parent_id: parentCollection.doc(userId),
      name,
      gender,
      birth_day,
      birth_weight,
      birth_height,
      image_url: imageUrl,
    });

    const childId = childResponse.id;

    const growthHistoryData = {
      weight: birth_weight,
      height: birth_height,
      created_at: Date.now(),
      children_id: childCollection.doc(childId),
    };

    const growthResponse = await growthCollection.add(growthHistoryData);

    const childDoc = await childCollection.doc(childId).get();

    res.status(201).json({
      error: false,
      message: 'Child successfully created',
      data: {
        img_url: imageUrl,
      },
    });
  });

  stream.end(imageBuffer);
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
      created_at: Date.now(),
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
      img_url: childData.image_url,
    },
  });
};

//          UPDATE CHILD BY ID
module.exports.updateChild = async (req, res) => {
  const { userId, id } = req.params;
  const childDoc = childCollection.doc(id);
  const child = await childDoc.get();

  const parentDoc = await parentCollection.doc(userId).get();
  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Update failed, parent not found',
    });
  }
  if (!child.exists) {
    return res.status(404).json({
      error: true,
      message: 'Update failed, child not found',
    });
  }

  const { weight, height, name, img_base64 } = req.body;

  const currentImageUrl = child.data().image_url;

  const growthHistoryData = {
    weight,
    height,
    created_at: Date.now(),
    children_id: childCollection.doc(id),
  };

  const growthResponse = await growthCollection.add(growthHistoryData);

  if (img_base64) {
    const imageBuffer = Buffer.from(
      img_base64.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );

    const imageTypeMatch = img_base64.match(/^data:image\/(\w+);base64,/);
    const imageType = imageTypeMatch ? imageTypeMatch[1] : 'jpeg'; // Default to 'jpeg'

    const fileName = `${userId}_${id}_profile_image.${imageType}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: `image/${imageType}`,
      },
    });

    stream.on('error', (uploadError) => {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      if (currentImageUrl) {
        const oldFileName = currentImageUrl.substring(
          currentImageUrl.lastIndexOf('/') + 1
        );
        const oldFile = bucket.file(oldFileName);

        try {
          await oldFile.delete();
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }

      await childDoc.update({
        name,
        weight,
        height,
        image_url: `https://storage.googleapis.com/${bucket.name}/${fileName}`, // Public URL of the uploaded image
      });

      res.status(200).json({
        error: false,
        message: 'Child updated successfully with new image',
      });
    });

    stream.end(imageBuffer);
  } else {
    await childDoc.update({
      name,
      weight,
      height,
    });

    res.status(200).json({
      error: false,
      message: 'Child updated successfully without changing the image',
      data: {
        img_url: currentImageUrl,
      },
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

  const growthHistoryQuerySnapshot = await growthCollection
    .where('children_id', '==', childDoc)
    .get();

  const deleteGrowthHistoryPromises = growthHistoryQuerySnapshot.docs.map(
    (doc) => doc.ref.delete()
  );

  await Promise.all(deleteGrowthHistoryPromises);

  await childDoc.delete();

  if (imageUrl) {
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
