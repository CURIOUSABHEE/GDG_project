import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect('mongodb://127.0.0.1:27017/linko')
    .then(async () => {
        console.log('Connected to MongoDB');

        const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }));
        const posts = await Post.find().limit(5).sort({ savedAt: -1 });

        console.log('\n=== Last 5 Saved Posts ===\n');
        posts.forEach((post, i) => {
            console.log(`${i + 1}. Platform: ${post.platform}`);
            console.log(`   URL: ${post.originalUrl}`);
            console.log(`   Content: ${post.content?.substring(0, 50)}...`);
            console.log('');
        });

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
