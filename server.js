const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const fetch = require('node-fetch');

const app = express();
const parser = new Parser({
    customFields: {
        item: ['pubDate', 'link', 'title', 'content', 'contentSnippet']
    }
});

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Your Google Alerts RSS feed URLs
const RSS_FEEDS = [
    'https://www.google.com/alerts/feeds/09182428279069180430/16660917434875034337', // AltMed (example)
    // Add your gas station alert feed URLs here when they're available
];

// Fetch all RSS feeds and combine them
app.get('/api/feeds', async (req, res) => {
    try {
        console.log('Fetching RSS feeds...');

        const feedPromises = RSS_FEEDS.map(async (feedUrl) => {
            try {
                const feed = await parser.parseURL(feedUrl);
                return feed.items || [];
            } catch (error) {
                console.error(`Error fetching feed ${feedUrl}:`, error.message);
                return [];
            }
        });

        const allFeeds = await Promise.all(feedPromises);
        const allItems = allFeeds.flat();

        // Sort by publication date (newest first)
        allItems.sort((a, b) => {
            const dateA = new Date(a.pubDate || a.isoDate);
            const dateB = new Date(b.pubDate || b.isoDate);
            return dateB - dateA;
        });

        // Format the items for the frontend
        const formattedItems = allItems.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate || item.isoDate,
            content: item.contentSnippet || item.content || '',
            source: extractSource(item.link)
        }));

        res.json({
            success: true,
            count: formattedItems.length,
            items: formattedItems
        });

    } catch (error) {
        console.error('Error fetching feeds:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to extract source domain from URL
function extractSource(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'Unknown Source';
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    console.log(`\n✅ RSS Feed Proxy Server running on ${baseUrl}`);
    console.log(`📡 API endpoint: ${baseUrl}/api/feeds`);
    console.log(`🏥 Health check: ${baseUrl}/api/health\n`);

    if (process.env.NODE_ENV !== 'production') {
        console.log('To add your Google Alerts RSS feeds:');
        console.log('1. Get the RSS feed URLs from Google Alerts');
        console.log('2. Add them to the RSS_FEEDS array in server.js');
        console.log('3. Restart the server\n');
    }
});
