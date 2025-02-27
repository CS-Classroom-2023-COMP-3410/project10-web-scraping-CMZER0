const axios = require('axios');
const fs = require('fs');
const path = require('path');

const URL = 'https://denverpioneers.com/';
const OUTPUT_FILE = path.join(__dirname, 'results', 'athletic_events.json');

(async () => {
    try {
        console.log('📡 Fetching DU Athletics homepage...');
        const { data: html } = await axios.get(URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        console.log('🔍 Searching for scoreboard JSON data...');

        // Locate the JSON-like structure inside the HTML
        const scoreboardStart = html.indexOf('{"start":0,"count":20');
        if (scoreboardStart === -1) {
            console.log('❌ No scoreboard JSON found.');
            return;
        }

        // Extract JSON string (find the closing bracket)
        const jsonStart = scoreboardStart;
        let jsonEnd = jsonStart;
        let bracketCount = 0;

        for (let i = jsonStart; i < html.length; i++) {
            if (html[i] === '{') bracketCount++;
            if (html[i] === '}') bracketCount--;
            if (bracketCount === 0) {
                jsonEnd = i + 1;
                break;
            }
        }

        const jsonText = html.substring(jsonStart, jsonEnd);
        const scoreboardData = JSON.parse(jsonText);

        console.log('✅ Extracted scoreboard JSON.');

        // Extract and format event details
        const events = scoreboardData.data.map(event => ({
            duTeam: event.sport ? event.sport.short_title : "Unknown Sport",  // Extract DU team name
            opponent: event.opponent ? event.opponent.title : "Unknown Opponent", // Extract opponent name
            date: event.date || "Unknown Date" // Extract event date
        }));

        // Ensure results directory exists
        const resultsDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        // Save extracted events to JSON file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ events }, null, 4));
        console.log(`✅ Scraped ${events.length} events. Data saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('❌ Error fetching athletic events:', error.message);
    }
})();


// const BASE_URL = 'https://www.du.edu';
// const CALENDAR_URL = `${BASE_URL}/calendar?search=&start_date=2025-01-01&end_date=2025-12-31`;