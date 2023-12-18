const admin = require('firebase-admin');
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

const parentCollection = db.collection('parents');
const childCollection = db.collection('child');
const growthCollection = db.collection('growth_history');

//          REGISTER A USER/PARENT
module.exports.register = async (req, res, next) => {
  const {
    email,
    password,
    name,
    address,
    gender,
    birth_day,
    celluler_number,
    status,
  } = req.body;

  const defaultImage =
    'https://storage.googleapis.com/bucket-capstone-project-stuntcare/default-profile-image.jpg';

  const userRecord = await admin.auth().createUser({
    email: email,
    password: password,
  });

  const parentDoc = await parentCollection.doc(userRecord.uid).set({
    email: email,
    name: name,
    address: address,
    gender: gender,
    birth_day: birth_day,
    celluler_number: celluler_number,
    status: status,
    firebaseUid: userRecord.uid,
    image_url: defaultImage,
  });

  res.status(201).json({
    error: false,
    message: 'Registration successful!',
  });
};

//          LOGOUT
module.exports.logout = (req, res, next) => {
  try {
    res.clearCookie('session');
    res.status(200).json({
      error: false,
      message: 'Logout successful!',
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'An error occurred during logout.',
    });
  }
};

//          READ ALL USER/PARENT
module.exports.index = async (req, res) => {
  const parentDoc = await parentCollection.get();
  const parent = parentDoc.docs.map((doc) => {
    const parentData = doc.data();

    return {
      id: doc.id,
      ...parentData,
    };
  });

  res.status(200).json({
    error: false,
    message: 'Parent data received successfully',
    data: {
      parent,
    },
  });
};

//          READ USER BY ID
module.exports.showParent = async (req, res) => {
  const { id } = req.params;
  const parentDoc = await parentCollection.doc(id).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'User not found',
    });
  }

  const parentData = parentDoc.data();

  res.status(200).json({
    error: false,
    message: 'User data received successfully',
    data: {
      id: parentDoc.id,
      ...parentDoc.data(),
    },
  });
};

//          UPDATE USER BY ID
module.exports.updateParent = async (req, res) => {
  const { id } = req.params;
  const parentDoc = await parentCollection.doc(id).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'User not found',
    });
  }

  const existingParentData = parentDoc.data();

  const { name, address, gender, birth_day, celluler_number, status } =
    req.body;

  const updatedParentData = {
    name: name || existingParentData.name,
    address: address || existingParentData.address,
    gender: gender || existingParentData.gender,
    birth_day: birth_day || existingParentData.birth_day,
    celluler_number: celluler_number || existingParentData.celluler_number,
    status: status || existingParentData.status,
  };

  // Handle profile picture update
  const imageBuffer = req.file ? req.file.buffer : null;
  const imageType = req.file ? req.file.mimetype.split('/')[1] : null;

  if (imageBuffer) {
    const fileName = `${id}_profile_image.${imageType}`;
    const file = bucket.file(fileName);
    const stream = file.createWriteStream();

    stream.on('error', (uploadError) => {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage',
      });
    });

    stream.on('finish', async () => {
      // Update parent document with new data including image_url
      await parentCollection.doc(id).update({
        ...updatedParentData,
        image_url: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
      });

      res.status(201).json({
        error: false,
        message: 'User data updated successfully',
      });
    });

    stream.end(imageBuffer);
  } else {
    // If no new image is provided
    await parentCollection.doc(id).update(updatedParentData);

    res.status(200).json({
      error: false,
      message: 'User data updated successfully',
    });
  }
};

//          DELETE USER BY ID
module.exports.deleteParent = async (req, res) => {
  const { id } = req.params;
  const parentDoc = await parentCollection.doc(id).get();

  if (!parentDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'User not found',
    });
  }

  const userId = parentDoc.data().firebaseUid;

  if (!userId) {
    return res.status(500).json({
      error: true,
      message: 'User ID not found in document.',
    });
  }

  const childQuerySnapshot = await childCollection
    .where('parent_id', '==', parentDoc.ref)
    .get();

  const deleteChildPromises = childQuerySnapshot.docs.map(async (childDoc) => {
    const growthHistoryQuerySnapshot = await growthCollection
      .where('children_id', '==', childDoc.ref)
      .get();

    const deleteGrowthPromises = growthHistoryQuerySnapshot.docs.map((doc) =>
      doc.ref.delete()
    );

    await Promise.all(deleteGrowthPromises);

    await childDoc.ref.delete();
  });

  await Promise.all(deleteChildPromises);

  // Delete the parent document
  await parentCollection.doc(id).delete();

  // Delete the user from Firebase Authentication
  await admin.auth().deleteUser(userId);

  // Delete the profile image from Google Cloud Storage
  const defaultImageUrl =
    'https://storage.googleapis.com/bucket-capstone-project-stuntcare/default-profile-image.jpg';
  const imageUrl = parentDoc.data().image_url;
  if (imageUrl && imageUrl !== defaultImageUrl) {
    const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
    const file = bucket.file(fileName);

    try {
      await file.delete();
    } catch (deleteError) {
      return res.status(500).json({
        error: true,
        message: 'Error uploading image to Google Cloud Storage ',
      });
    }
  }

  res.status(200).json({
    error: false,
    message: 'User deleted successfully',
  });
};
