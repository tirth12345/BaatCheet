const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import all models
const User = require('./models/User');
const Comment = require('./models/Comment');
const Discussion = require('./models/Discussion');
const NewsStats = require('./models/NewsStats');
const News = require('./models/News');
const ChatMessage = require('./models/ChatMessage');

async function importData() {
    try {
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
            console.error('Error: MONGODB_URI is missing or pointing to localhost! Please update .env with your Atlas URI.');
            process.exit(1);
        }

        console.log('Connecting to Atlas MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully!');

        const backupPath = path.join(__dirname, 'mongo_backup.json');
        if (!fs.existsSync(backupPath)) {
            console.error(`Backup file not found at ${backupPath}`);
            process.exit(1);
        }

        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        console.log('Clearing existing data and importing backup...');
        
        if (backupData.users && backupData.users.length) {
            await User.deleteMany({});
            await User.insertMany(backupData.users);
            console.log(`Imported ${backupData.users.length} Users.`);
        }
        
        if (backupData.comments && backupData.comments.length) {
            await Comment.deleteMany({});
            await Comment.insertMany(backupData.comments);
            console.log(`Imported ${backupData.comments.length} Comments.`);
        }
        
        if (backupData.discussions && backupData.discussions.length) {
            await Discussion.deleteMany({});
            await Discussion.insertMany(backupData.discussions);
            console.log(`Imported ${backupData.discussions.length} Discussions.`);
        }
        
        if (backupData.newsStats && backupData.newsStats.length) {
            await NewsStats.deleteMany({});
            await NewsStats.insertMany(backupData.newsStats);
            console.log(`Imported ${backupData.newsStats.length} NewsStats.`);
        }
        
        if (backupData.news && backupData.news.length) {
            await News.deleteMany({});
            await News.insertMany(backupData.news);
            console.log(`Imported ${backupData.news.length} News articles.`);
        }
        
        if (backupData.chatMessages && backupData.chatMessages.length) {
            await ChatMessage.deleteMany({});
            await ChatMessage.insertMany(backupData.chatMessages);
            console.log(`Imported ${backupData.chatMessages.length} Chat Messages.`);
        }

        console.log('Data import to Atlas completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error importing data:', err);
        process.exit(1);
    }
}

importData();
