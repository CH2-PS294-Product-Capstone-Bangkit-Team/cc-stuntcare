const Firestore = require('@google-cloud/firestore');
const serviceAccount = require('../serviceAccountStuntcare.json');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './serviceAccountStuntcare.json',
});

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

  const { name, gender, birth_day, birth_weight, birth_height } = req.body;
  const parent_id = parentCollection.doc(userId);
  const bmi_status = 'normal'; // Model from ML
  const stunting_status = 'Severely stunting'; // Model from ML
  const child_daily_menu = ['ayam pecel', 'kopi starbuceks']; // Model from ML
  const food_recommendation = ['pizza 5 meters', 'kopi starling']; // Model from ML

  const childResponse = await childCollection.add({
    parent_id,
    name,
    gender,
    birth_day,
    birth_weight,
    birth_height,
    stunting_status,
    bmi_status,
    food_recommendation,
    child_daily_menu,
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
    error: 'false',
    message: 'Child successfully created',
  });
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

  const { weight, height, name } = req.body;

  const growthHistoryData = {
    weight,
    height,
    created_at: Date.now(),
    children_id: childCollection.doc(id),
  };

  const growthResponse = await growthCollection.add(growthHistoryData);

  await childDoc.update({
    name,
  });

  res.status(201).json({
    error: false,
    message: 'Child updated successfully',
  });
};

//          DELETE CHILD BY ID
module.exports.deleteChild = async (req, res) => {
  const { userId, id } = req.params;
  const childDoc = childCollection.doc(id);
  const parentDoc = await parentCollection.doc(userId).get();
  const child = await childDoc.get();

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

  const growthHistoryQuerySnapshot = await growthCollection
    .where('children_id', '==', childDoc)
    .get();

  await childDoc.delete();

  const deletePromises = growthHistoryQuerySnapshot.docs.map((doc) =>
    doc.ref.delete()
  );
  await Promise.all(deletePromises);

  res.status(200).json({
    error: false,
    message: 'Child deleted successfully',
  });
};
