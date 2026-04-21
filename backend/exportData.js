const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import all models
const User = require('./models/User');
const Comment = require('./models/Comment');
const Discussion = require('./models/Discussion');
const NewsStats = require('./models/NewsStats');
const News = require('./models/News');
const VideoRoom = require('./models/VideoRoom');
const ChatMessage = require('./models/ChatMessage');
const Recording = require('./models/Recording');
const Otp = require('./models/Otp');

const MONGODB_URI = 'mongodb://localhost:27017/baatcheet';

async function exportData() {
    try {
        console.log('Connecting to local MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const backupData = {};
        
        console.log('Exporting Users...');
        backupData.users = await User.find().lean();
        
        console.log('Exporting Comments...');
        backupData.comments = await Comment.find().lean();
        
        console.log('Exporting Discussions...');
        backupData.discussions = await Discussion.find().lean();
        
        console.log('Exporting NewsStats...');
        backupData.newsStats = await NewsStats.find().lean();
        
        console.log('Exporting News...');
        backupData.news = await News.find().lean();
        
        console.log('Exporting ChatMessages...');
        backupData.chatMessages = await ChatMessage.find().lean();
        
        const backupPath = path.join(__dirname, 'mongo_backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        
        console.log(`Database exported successfully to ${backupPath}!`);
        process.exit(0);
    } catch (err) {
        console.error('Error exporting data at:', err);
        process.exit(1);
    }
}

exportData();
