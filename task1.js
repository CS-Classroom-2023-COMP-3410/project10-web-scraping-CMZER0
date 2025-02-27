const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BULLETIN_URL = 'https://bulletin.du.edu/undergraduate/coursedescriptions/comp/';
const OUTPUT_FILE = path.join(__dirname, 'results', 'bulletin.json');

async function scrapeCourses() {
    try {
        console.log('Fetching DU Bulletin page...');
        const { data } = await axios.get(BULLETIN_URL);
        const $ = cheerio.load(data);

        console.log('Parsing course information...');
        const courses = [];

        $('.courseblock').each((_, element) => {
            const courseTitleElement = $(element).find('.courseblocktitle strong');
            const courseDescElement = $(element).find('.courseblockdesc');

            if (courseTitleElement.length) {
                const courseText = courseTitleElement.text().trim().replace(/\s+/g, ' ');
                const descText = courseDescElement.length ? courseDescElement.text().trim() : "No description available.";

                console.log(`Found course: ${courseText}`);
                console.log(`Description: ${descText.substring(0, 100)}...`);

                // Extract course code and title with more flexible regex
                const match = courseText.match(/(COMP[-\s]?(\d{4}))\s+(.+)/);
                if (match) {
                    const courseCode = match[1].replace(/\s/, '-'); // Normalize format to COMP-XXXX
                    const courseNumber = parseInt(match[2], 10); // Extract course number as an integer
                    const courseTitle = match[3];

                    // Only keep courses that are 3000-level or higher
                    if (courseNumber >= 3000) {
                        // Exclude courses that mention prerequisites
                        const hasPrerequisite = /prereq|requires|requirement|needed before|must have completed/i.test(descText);
                        if (!hasPrerequisite) {
                            console.log(`✅ Adding Course (No Prerequisite, Upper-Level): ${courseCode} - ${courseTitle}`);
                            courses.push({ course: courseCode, title: courseTitle, description: descText });
                        } else {
                            console.log(`❌ Skipping Course (Has Prerequisite): ${courseCode} - ${courseTitle}`);
                        }
                    } else {
                        console.log(`❌ Skipping Course (Lower-Level): ${courseCode} - ${courseTitle}`);
                    }
                }
            }
        });

        // Ensure results directory exists
        const resultsDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ courses }, null, 4));
        console.log(`Scraping complete. ${courses.length} upper-level courses found without prerequisites. Results saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error scraping the DU Bulletin:', error);
    }
}

scrapeCourses();