const Firestore = require('@google-cloud/firestore');
const serviceAccount = require('../cc-stuntcare-demo-f23bdc5f608a.json');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './cc-stuntcare-demo-f23bdc5f608a.json',
});

const childCollection = db.collection('child');
const growthCollection = db.collection('growth_history');

//          GET ALL CHILD
module.exports.index = async (req, res) => {
  const childDoc = await childCollection.get();
  const child = childDoc.docs.map((doc) => {
    const childData = doc.data();

    const parentId = childData.parent_id.id;

    return {
      id: doc.id,
      name: childData.name,
      birth_day: childData.birth_day,
      gender: childData.gender,
      parent_id: parentId,
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
  const { name, gender, birth_day, birth_weight, birth_height } = req.body;
  const parent_id = 'iniidparent';
  const bmi_status = 'normal'; // Model from ML
  const stunting_status = 'Severely stunting'; // Model from ML
  const child_daily_menu = ['ayam pecel', 'kopi starbuceks']; // Model from ML
  const food_recommendation = ['pizza 5 meters', 'kopi starling']; // Model from ML

  const childResponse = await childCollection.add({
    parent_id,
    ...req.body,
    stunting_status,
    bmi_status,
    food_recommendation,
    child_daily_menu,
  });

  const childId = childResponse.id;

  const growthHistoryData = {
    weight: birth_weight,
    height: birth_height,
    created_at: Firestore.FieldValue.serverTimestamp(),
    children_id: childCollection.doc(childId),
  };

  const growthResponse = await growthCollection.add(growthHistoryData);

  const childDoc = await childCollection.doc(childId).get();

  const childData = {
    id: childId,
    ...childDoc.data(),
  };

  res.status(201).json({
    error: 'false',
    message: 'Child successfully created',
  });
};

//          GET CHILD BY ID
module.exports.showChild = async (req, res) => {
  const { id } = req.params;
  const childDoc = await childCollection.doc(id).get();

  if (!childDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Child not found',
    });
  }

  const childData = childDoc.data();
  const parentId = childData.parent_id;
  const childReference = childCollection.doc(id);

  const growthHistorySnapshot = await growthCollection
    .where('children_id', '==', childReference)
    .get();

  const growthHistoryData = growthHistorySnapshot.docs.map((doc) => {
    const formattedDate = new Date(
      doc.data().created_at._seconds * 1000
    ).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return {
      id: doc.id,
      weight: doc.data().weight,
      created_at: formattedDate,
      children_id: doc.data().children_id.id,
      height: doc.data().height,
    };
  });

  res.status(200).json({
    message: 'Child data received successfully',
    data: {
      child: {
        id: childDoc.id,
        parent_id: parentId,
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
    },
  });
};

module.exports.updateChild = async (req, res) => {
  const { id } = req.params;
  const childDoc = childCollection.doc(id);
  const child = await childDoc.get();

  if (!child.exists) {
    return res.status(404).json({
      error: true,
      message: 'Child not found',
    });
  }

  const { weight, height } = req.body;

  const growthHistoryData = {
    weight,
    height,
    created_at: Firestore.FieldValue.serverTimestamp(),
    children_id: childCollection.doc(id),
  };

  const growthResponse = await growthCollection.add(growthHistoryData);

  res.status(200).json({
    error: 'false',
    message: 'Child updated successfully',
  });
};

module.exports.deleteChild = async (req, res) => {
  const { id } = req.params;
  const childDoc = childCollection.doc(id);
  const child = await childDoc.get();

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
    message: 'Child and associated growth history deleted successfully',
  });
};
