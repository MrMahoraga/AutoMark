const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/attendance')
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    const teachers = await db.collection('teachers').find({}).toArray();
    console.log('Teachers:', teachers);

    // Drop the collection to clear any old data
    await db.collection('teachers').drop();
    console.log('Dropped teachers collection');

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
