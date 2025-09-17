const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/attendance')
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    const teachers = await db.collection('teachers').find({}).toArray();
    console.log('Teachers:', teachers);

    const users = await db.collection('users').find({}).toArray();
    console.log('Users:', users);

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
