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

// Your Google Alerts RSS feed URLs - 34 Gas Station Alerts
const RSS_FEEDS = [
    'https://www.google.com/alerts/feeds/09182428279069180430/2356736684601183531',
    'https://www.google.com/alerts/feeds/09182428279069180430/10272491932958314872',
    'https://www.google.com/alerts/feeds/09182428279069180430/13313358979928774559',
    'https://www.google.com/alerts/feeds/09182428279069180430/8341794456788693301',
    'https://www.google.com/alerts/feeds/09182428279069180430/16884310037910078188',
    'https://www.google.com/alerts/feeds/09182428279069180430/7948661866159659660',
    'https://www.google.com/alerts/feeds/09182428279069180430/18098273169971572213',
    'https://www.google.com/alerts/feeds/09182428279069180430/7464813959798405035',
    'https://www.google.com/alerts/feeds/09182428279069180430/17182240907846120717',
    'https://www.google.com/alerts/feeds/09182428279069180430/1226120987289009438',
    'https://www.google.com/alerts/feeds/09182428279069180430/4345902348516778214',
    'https://www.google.com/alerts/feeds/09182428279069180430/3328131774048131868',
    'https://www.google.com/alerts/feeds/09182428279069180430/2641101500755475746',
    'https://www.google.com/alerts/feeds/09182428279069180430/2665165367342573063',
    'https://www.google.com/alerts/feeds/09182428279069180430/1856006892992916883',
    'https://www.google.com/alerts/feeds/09182428279069180430/11760473391334443585',
    'https://www.google.com/alerts/feeds/09182428279069180430/16754394224087368820',
    'https://www.google.com/alerts/feeds/09182428279069180430/805090456831878584',
    'https://www.google.com/alerts/feeds/09182428279069180430/2356736684601182860',
    'https://www.google.com/alerts/feeds/09182428279069180430/11561908779301281246',
    'https://www.google.com/alerts/feeds/09182428279069180430/2862118317250464279',
    'https://www.google.com/alerts/feeds/09182428279069180430/7125003852991128726',
    'https://www.google.com/alerts/feeds/09182428279069180430/8854767764924737815',
    'https://www.google.com/alerts/feeds/09182428279069180430/2214701372282077850',
    'https://www.google.com/alerts/feeds/09182428279069180430/15967401914306998170',
    'https://www.google.com/alerts/feeds/09182428279069180430/18098273169971569420',
    'https://www.google.com/alerts/feeds/09182428279069180430/6030688961984603201',
    'https://www.google.com/alerts/feeds/09182428279069180430/13923193800938194260',
    'https://www.google.com/alerts/feeds/09182428279069180430/10812523901845474331',
    'https://www.google.com/alerts/feeds/09182428279069180430/17386860109803368591',
    'https://www.google.com/alerts/feeds/09182428279069180430/14009841047842724740',
    'https://www.google.com/alerts/feeds/09182428279069180430/3546512814188894202',
    'https://www.google.com/alerts/feeds/09182428279069180430/805090456831878167',
    'https://www.google.com/alerts/feeds/09182428279069180430/1226120987289009546'
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
