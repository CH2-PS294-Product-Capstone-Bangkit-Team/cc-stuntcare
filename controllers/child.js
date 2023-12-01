const Firestore = require('@google-cloud/firestore');
const serviceAccount = require('../cc-stuntcare-demo-f23bdc5f608a.json');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './cc-stuntcare-demo-f23bdc5f608a.json',
});

const childCollection = db.collection('child');

module.exports.index = async (req, res) => {
  const childDoc = await childCollection.get();
  const child = childDoc.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  res.status(200).json({
    message: 'Child data received successfully',
    data: {
      child,
    },
  });
};

module.exports.addChild = async (req, res) => {
  const { name, gender, berat, tinggi } = req.body;
  const birth_day = '01-05-2003';

  const newChild = {
    ...req.body,
    birth_day,
  };

  const response = await childCollection.add(newChild);
  const childId = response.id;
  res.status(201).json({
    message: 'childs successfully created',
    data: {
      child: {
        id: childId,
        ...newChild,
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
      message: 'child not found',
      data: null,
    });
  }

  const { name, berat, tinggi } = req.body;

  const updateData = {
    ...req.body,
  };

  await childDoc.update(updateData);

  const updatedChild = await childDoc.get();

  res.status(200).json({
    message: 'child update successfully',
    data: {
      id: updatedChild.id,
      ...updatedChild.data(),
    },
  });
};

module.exports.deleteChild = async (req, res) => {
  const { id } = req.params;
  const childDoc = childCollection.doc(id);
  const child = await childDoc.get();

  if (!child.exists) {
    return res.status(404).json({
      message: 'Delete failed, child not found',
      data: null,
    });
  }

  await childDoc.delete();

  res.status(200).json({
    message: 'child deleted successfully',
    data: {
      id: child.id,
      ...child.data(),
    },
  });
};
