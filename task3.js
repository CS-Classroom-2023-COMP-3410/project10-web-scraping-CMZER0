const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.du.edu';
const CALENDAR_URL = `${BASE_URL}/calendar?search=&start_date=2025-01-01&end_date=2025-12-31`;
const OUTPUT_FILE = path.join(__dirname, 'results/calendar_events.json');

async function fetchHTML(url) {
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        console.error(`❌ Error fetching ${url}:`, error.message);
        return null;
    }
}

async function fetchEventDescription(eventUrl) {
    const fullUrl = eventUrl.startsWith('http') ? eventUrl : `${BASE_URL}${eventUrl}`;
    const html = await fetchHTML(fullUrl);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Try multiple description selectors
    let description = $('div[itemprop="description"], div.description').text().trim();

    // If there are multiple paragraphs, join them
    if (!description) {
        description = $('div[itemprop="description"] p, div.description p')
            .map((_, el) => $(el).text().trim())
            .get()
            .join(' ');
    }

    return description || null;
}

async function scrapeEvents() {
    console.log('📱 Fetching DU Calendar page...');
    const html = await fetchHTML(CALENDAR_URL);
    if (!html) return;

    const $ = cheerio.load(html);
    let events = [];

    $('.event-card').each((_, element) => {
        const eventCard = $(element);

        const title = eventCard.find('h3').text().trim();
        const dateText = eventCard.find('p').first().text().trim();
        const time = eventCard.find('.icon-du-clock').parent().text().trim() || null;

        // Extract the event URL from the <a> tag itself
        let url = eventCard.attr('href');

        if (url) {
            url = url.startsWith('http') ? url : `${BASE_URL}${url}`;
        } else {
            console.log(`⚠️ No URL found for event: "${title}"`);
        }

        if (!title || !dateText) {
            console.log('🚫 Skipping event with missing title or date.');
            return;
        }

        const fullDate = `${dateText}, 2025`;

        events.push({ title, date: fullDate, time, description: null, url: url || null });
    });

    console.log(`✅ Found ${events.length} events. Fetching descriptions...`);

    for (let event of events) {
        console.log(`🔗 Fetching description for: ${event.title} (${event.url})`);
        if (event.url) {
            event.description = await fetchEventDescription(event.url);
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ events }, null, 4));
    console.log(`✅ Scraping complete. Results saved to ${OUTPUT_FILE}`);
}

// Run the scraper
scrapeEvents();