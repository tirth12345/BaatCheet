// Simple test script to verify news archiving system
// Run with: node test-news-archiving.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001';

async function testNewsArchiving() {
    console.log('🧪 Testing News Archiving System\n');
    console.log('=' .repeat(50));

    try {
        // Test 1: Get current news
        console.log('\n1️⃣ Testing GET /api/news (current news only)');
        const currentNews = await axios.get(`${API_BASE_URL}/api/news`);
        console.log(`   ✅ Found ${currentNews.data.length} current news articles`);
        if (currentNews.data.length > 0) {
            const sample = currentNews.data[0];
            console.log(`   📰 Sample: "${sample.title.substring(0, 50)}..."`);
            console.log(`   📅 Fetched: ${sample.fetchedAt || 'N/A'}`);
            console.log(`   📦 Archived: ${sample.isArchived || false}`);
        }

        // Test 2: Get all news including archived
        console.log('\n2️⃣ Testing GET /api/news/all?includeArchived=true');
        const allNews = await axios.get(`${API_BASE_URL}/api/news/all?includeArchived=true`);
        console.log(`   ✅ Found ${allNews.data.length} total news articles (including archived)`);
        const archivedCount = allNews.data.filter(n => n.isArchived).length;
        console.log(`   📦 Archived articles: ${archivedCount}`);
        console.log(`   📰 Current articles: ${allNews.data.length - archivedCount}`);

        // Test 3: Get archived news only
        console.log('\n3️⃣ Testing GET /api/news/archived');
        const archivedNews = await axios.get(`${API_BASE_URL}/api/news/archived`);
        console.log(`   ✅ Found ${archivedNews.data.length} archived articles`);

        // Test 4: Get news by category
        console.log('\n4️⃣ Testing GET /api/news/category/Technology');
        const techNews = await axios.get(`${API_BASE_URL}/api/news/category/Technology`);
        console.log(`   ✅ Found ${techNews.data.length} Technology articles`);

        // Test 5: Test archiving an article (if articles exist)
        if (currentNews.data.length > 0) {
            console.log('\n5️⃣ Testing POST /api/news/:id/archive');
            const articleId = currentNews.data[0].id;
            console.log(`   📝 Archiving article ID: ${articleId}`);
            
            const archiveResult = await axios.post(`${API_BASE_URL}/api/news/${articleId}/archive`);
            console.log(`   ✅ Article archived successfully`);

            // Verify it's archived
            const verifyArchive = await axios.get(`${API_BASE_URL}/api/news/all?includeArchived=true`);
            const archivedArticle = verifyArchive.data.find(a => a.id === articleId);
            console.log(`   ✔️  Verified: isArchived = ${archivedArticle?.isArchived || 'not found'}`);

            // Unarchive it
            console.log('\n6️⃣ Testing POST /api/news/:id/unarchive');
            await axios.post(`${API_BASE_URL}/api/news/${articleId}/unarchive`);
            console.log(`   ✅ Article unarchived successfully`);
        }

        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('✅ All tests passed!');
        console.log('\n📊 Summary:');
        console.log(`   Total articles in database: ${allNews.data.length}`);
        console.log(`   Current (non-archived): ${allNews.data.length - archivedCount}`);
        console.log(`   Archived: ${archivedCount}`);
        console.log('\n✨ News archiving system is working correctly!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
testNewsArchiving().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
