const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/attendance')
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    const schools = await db.collection('schools').find({}).toArray();
    console.log('Schools:', schools);
    
    // Drop the collection to clear any old indexes
    await db.collection('schools').drop();
    console.log('Dropped schools collection');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
