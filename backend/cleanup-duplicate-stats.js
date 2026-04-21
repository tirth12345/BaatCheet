const mongoose = require('mongoose');
require('dotenv').config();

const NewsStats = require('./models/NewsStats');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baatcheet';

async function cleanupDuplicates() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all newsIds with duplicates
        const duplicates = await NewsStats.aggregate([
            {
                $group: {
                    _id: '$newsId',
                    count: { $sum: 1 },
                    ids: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('No duplicates found!');
            await mongoose.disconnect();
            return;
        }

        console.log(`Found ${duplicates.length} news items with duplicates`);

        let totalDeleted = 0;
        for (const dup of duplicates) {
            console.log(`\nNewsId ${dup._id} has ${dup.count} records`);
            
            // Keep the first one, delete the rest
            const idsToDelete = dup.ids.slice(1);
            const result = await NewsStats.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`  Deleted ${result.deletedCount} duplicate records`);
            totalDeleted += result.deletedCount;
        }

        console.log(`\nTotal deleted: ${totalDeleted}`);
        
        // Verify cleanup
        const remainingDuplicates = await NewsStats.aggregate([
            {
                $group: {
                    _id: '$newsId',
                    count: { $sum: 1 }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        if (remainingDuplicates.length === 0) {
            console.log('\n✓ All duplicates have been cleaned up!');
        } else {
            console.log('\n✗ Warning: Some duplicates still remain');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupDuplicates();
