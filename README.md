# Gas Station Alerts RSS Feed Backend

This Node.js server fetches RSS feeds from your Google Alerts and serves them to your website.

## Setup

1. **Install Dependencies** (already done):
   ```bash
   npm install
   ```

2. **Get Your RSS Feed URLs**:

   **IMPORTANT**: Your newly created gas station alerts don't have RSS feeds yet. Google takes 24-48 hours to generate RSS feeds for new alerts.

   To get the RSS feed URLs once they're available:
   - Go to https://www.google.com/alerts
   - Find each gas station alert
   - Click the RSS icon (📡) next to the alert
   - Copy the URL from your browser's address bar
   - The URL will look like: `https://www.google.com/alerts/feeds/09182428279069180430/ALERT_ID`

3. **Add RSS Feed URLs to server.js**:

   Open `server.js` and update the `RSS_FEEDS` array with your RSS feed URLs:

   ```javascript
   const RSS_FEEDS = [
       'https://www.google.com/alerts/feeds/09182428279069180430/ALERT_ID_1',
       'https://www.google.com/alerts/feeds/09182428279069180430/ALERT_ID_2',
       // Add all 10 gas station alert RSS feed URLs here
   ];
   ```

## Your Gas Station Alerts (waiting for RSS feeds):

1. "new gas station" "opening soon"
2. "convenience store" "fuel pumps" "coming soon"
3. "travel center" "new construction"
4. "fuel station" "permit approved"
5. "service station" "new development"
6. "filling station" "coming soon"
7. "c-store" "fuel" "new location"
8. "truck stop" "new construction"
9. "gas bar" "opening"
10. "convenience mart" "gas pumps" "new"

## Running the Server

Start the server:
```bash
npm start
```

The server will run on http://localhost:3000

## API Endpoints

- `GET /api/feeds` - Fetch all RSS feed items
- `GET /api/health` - Health check

## Testing

Once running, test the API:
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/feeds
```

## Troubleshooting

- **No RSS icons on new alerts**: Wait 24-48 hours for Google to generate the feeds
- **CORS errors**: The server has CORS enabled for all origins
- **No data**: Make sure you've added valid RSS feed URLs to the RSS_FEEDS array

## Next Steps

1. Wait for Google to generate RSS feeds for your new alerts (24-48 hours)
2. Collect the RSS feed URLs from Google Alerts
3. Add them to server.js
4. Restart the server
5. The website will automatically fetch real data!
