const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/linko')
    .then(async () => {
        console.log('Connected to MongoDB');
        try {
            await mongoose.connection.collection('users').dropIndexes();
            console.log('Dropped all indexes on users collection');
        } catch (e) {
            console.log('Error dropping indexes (might not exist):', e.message);
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
