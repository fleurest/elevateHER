require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function authorize() {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return oAuth2Client;
}

// upcoming events from Google Calendar
async function listUpcomingEvents(calendarId) {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return res.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        description: event.description || '',
    }));
}

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// past events from Neo4j
async function listPastEvents() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (e:Event) RETURN e LIMIT 5`
        );
        console.log('Fetched records:', result.records.length);
        result.records.forEach((r, i) => console.log(`Event ${i}:`, r.get('e').properties));
        return result.records.map(r => r.get('e').properties);
    } catch (err) {
        console.error('Neo4j query failed:', err);
        return [];
    } finally {
        await session.close();
    }
}

module.exports = {
    listUpcomingEvents,
    listPastEvents
};
