const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const parser = new Parser({
    customFields: {
        item: ['pubDate', 'link', 'title', 'content', 'contentSnippet']
    }
});

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

const FEEDS_FILE = path.join(__dirname, 'feeds.json');

// Load feeds from JSON file
async function loadFeeds() {
    try {
        const data = await fs.readFile(FEEDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading feeds:', error);
        // Return default structure if file doesn't exist
        return { categories: {} };
    }
}

// Save feeds to JSON file
async function saveFeeds(feedsData) {
    try {
        await fs.writeFile(FEEDS_FILE, JSON.stringify(feedsData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving feeds:', error);
        return false;
    }
}

// Get all active RSS feed URLs from all categories
function getActiveFeeds(feedsData, categoryFilter = null) {
    const feeds = [];

    for (const [categoryId, category] of Object.entries(feedsData.categories)) {
        // Skip if filtering by category and this isn't the one
        if (categoryFilter && categoryId !== categoryFilter) continue;

        if (category.feeds && Array.isArray(category.feeds)) {
            category.feeds.forEach(feed => {
                if (feed.enabled !== false) {
                    feeds.push({
                        url: feed.url,
                        name: feed.name,
                        category: categoryId,
                        categoryName: category.name
                    });
                }
            });
        }
    }

    return feeds;
}

// API: Get all categories and their feeds
app.get('/api/categories', async (req, res) => {
    try {
        const feedsData = await loadFeeds();
        res.json({
            success: true,
            categories: feedsData.categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API: Add a new feed to a category
app.post('/api/feeds', async (req, res) => {
    try {
        const { categoryId, feedUrl, feedName } = req.body;

        if (!categoryId || !feedUrl || !feedName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: categoryId, feedUrl, feedName'
            });
        }

        const feedsData = await loadFeeds();

        // Create category if it doesn't exist
        if (!feedsData.categories[categoryId]) {
            feedsData.categories[categoryId] = {
                name: categoryId,
                feeds: []
            };
        }

        // Check if feed already exists
        const exists = feedsData.categories[categoryId].feeds.some(
            feed => feed.url === feedUrl
        );

        if (exists) {
            return res.status(400).json({
                success: false,
                error: 'Feed already exists in this category'
            });
        }

        // Add new feed
        feedsData.categories[categoryId].feeds.push({
            url: feedUrl,
            name: feedName,
            enabled: true,
            addedAt: new Date().toISOString()
        });

        await saveFeeds(feedsData);

        res.json({
            success: true,
            message: 'Feed added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API: Remove a feed
app.delete('/api/feeds', async (req, res) => {
    try {
        const { categoryId, feedUrl } = req.body;

        if (!categoryId || !feedUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: categoryId, feedUrl'
            });
        }

        const feedsData = await loadFeeds();

        if (!feedsData.categories[categoryId]) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Remove feed
        feedsData.categories[categoryId].feeds = feedsData.categories[categoryId].feeds.filter(
            feed => feed.url !== feedUrl
        );

        await saveFeeds(feedsData);

        res.json({
            success: true,
            message: 'Feed removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API: Toggle feed enabled/disabled
app.patch('/api/feeds/toggle', async (req, res) => {
    try {
        const { categoryId, feedUrl, enabled } = req.body;

        if (!categoryId || !feedUrl || enabled === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: categoryId, feedUrl, enabled'
            });
        }

        const feedsData = await loadFeeds();

        if (!feedsData.categories[categoryId]) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Find and toggle feed
        const feed = feedsData.categories[categoryId].feeds.find(
            f => f.url === feedUrl
        );

        if (!feed) {
            return res.status(404).json({
                success: false,
                error: 'Feed not found'
            });
        }

        feed.enabled = enabled;

        await saveFeeds(feedsData);

        res.json({
            success: true,
            message: 'Feed toggled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API: Create a new category
app.post('/api/categories', async (req, res) => {
    try {
        const { categoryId, categoryName } = req.body;

        if (!categoryId || !categoryName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: categoryId, categoryName'
            });
        }

        const feedsData = await loadFeeds();

        if (feedsData.categories[categoryId]) {
            return res.status(400).json({
                success: false,
                error: 'Category already exists'
            });
        }

        feedsData.categories[categoryId] = {
            name: categoryName,
            feeds: []
        };

        await saveFeeds(feedsData);

        res.json({
            success: true,
            message: 'Category created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fetch all RSS feeds and combine them
app.get('/api/feeds', async (req, res) => {
    try {
        const category = req.query.category || null;
        console.log('Fetching RSS feeds for category:', category || 'all');

        const feedsData = await loadFeeds();
        const activeFeeds = getActiveFeeds(feedsData, category);

        console.log(`Found ${activeFeeds.length} active feeds`);

        const feedPromises = activeFeeds.map(async (feedInfo) => {
            try {
                const feed = await parser.parseURL(feedInfo.url);
                // Add category and feed name to each item
                return (feed.items || []).map(item => ({
                    ...item,
                    feedName: feedInfo.name,
                    category: feedInfo.category,
                    categoryName: feedInfo.categoryName
                }));
            } catch (error) {
                console.error(`Error fetching feed ${feedInfo.url}:`, error.message);
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
            source: extractSource(item.link),
            feedName: item.feedName,
            category: item.category,
            categoryName: item.categoryName
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
    console.log(`📂 Categories endpoint: ${baseUrl}/api/categories`);
    console.log(`🏥 Health check: ${baseUrl}/api/health\n`);
});
