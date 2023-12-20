const admin = require('firebase-admin');
const Firestore = require('@google-cloud/firestore');
const serviceAccount = require('../serviceAccountStuntcare.json');

const db = new Firestore({
  projectId: serviceAccount.project_id,
  keyFilename: './serviceAccountStuntcare.json',
});

const doctorCollection = db.collection('doctors');

module.exports.index = async (req, res) => {
  const { name } = req.query;
  let doctorQuery = doctorCollection;

  // Check if the 'name' query parameter is present
  if (name) {
    const searchName = name.replace(name[0], name[0].toUpperCase());
    doctorQuery = doctorQuery.where('name', '==', searchName);
  }

  const doctorSnapshot = await doctorQuery.get();

  if (doctorSnapshot.empty) {
    return res.status(404).json({
      error: true,
      message: 'Doctor list is empty',
    });
  }

  const doctor = doctorSnapshot.docs.map((doc) => {
    const doctorData = doc.data();
    return {
      id: doc.id,
      ...doctorData,
    };
  });

  res.status(200).json({
    error: false,
    message: 'All doctor data received successfully',
    data: {
      doctor,
    },
  });
};

module.exports.showDoctor = async (req, res) => {
  const { id } = req.params;
  const doctorDoc = await doctorCollection.doc(id).get();

  if (!doctorDoc.exists) {
    return res.status(404).json({
      error: true,
      message: 'Doctor not found',
    });
  }

  res.status(200).json({
    error: false,
    message: 'Doctor data received successfully',
    data: doctorDoc.data(),
  });
};
