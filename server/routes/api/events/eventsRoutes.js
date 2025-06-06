const router = require('express').Router();
const { isAuthenticated } = require('../../../authentication');
const { getCalendarEvents } = require('../../../services/EventCalService');
const { listPastEvents } = require('../../../services/EventService');
const axios = require('axios');
const neo4j = require('neo4j-driver');
const { convertNeo4jIntegers } = require('../../../utils/neo4jHelpers');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const calendarId = process.env.GOOGLE_CALENDAR_ID;
const apiKey = process.env.GOOGLE_API_KEY;

router.post('/', async (req, res) => {
  const { name, sport, location, roles, year, sameAs } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  const session = driver.session();
  try {
    const cypher = `
      MERGE (e:Event {name: $name})
      ON CREATE SET 
        e.sport = $sport,
        e.location = $location,
        e.roles = $roles,
        e.year = $year,
        e.sameAs = $sameAs,
        e.createdAt = datetime(),
        e.uuid = randomUUID()
      ON MATCH SET
        e.sport = COALESCE($sport, e.sport),
        e.location = COALESCE($location, e.location),
        e.roles = COALESCE($roles, e.roles),
        e.year = COALESCE($year, e.year),
        e.sameAs = COALESCE($sameAs, e.sameAs),
        e.updatedAt = datetime()
      RETURN e
    `;

    const result = await session.run(cypher, {
      name,
      sport: sport || null,
      location: location || null,
      roles: roles || null,
      year: year || null,
      sameAs: sameAs || null
    });

    const event = result.records[0]?.get('e').properties;

    res.status(201).json({
      message: `Event ${name} created/updated successfully`,
      event: event
    });

  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    await session.close();
  }
});

// LINK EVENT TO SPORT
router.post('/:eventId/sport', async (req, res) => {
  const { eventId } = req.params;
  const { sportName } = req.body;

  if (!sportName) {
    return res.status(400).json({ error: 'Sport name is required' });
  }

  const session = driver.session();
  try {
    const cypher = `
      MATCH (e:Event {uuid: $eventId})
      MERGE (s:Sport {name: $sportName})
      ON CREATE SET s.label = 'Sport', s.createdAt = datetime()
      MERGE (e)-[:PARTICIPATES_IN]->(s)
      RETURN e, s
    `;

    await session.run(cypher, { eventId, sportName });

    res.json({
      message: `Event linked to sport ${sportName}`
    });

  } catch (err) {
    console.error('Error linking event to sport:', err);
    res.status(500).json({ error: 'Failed to link event to sport' });
  } finally {
    await session.close();
  }
});

// GET ALL EVENTS
router.get('/list', async (req, res) => {
  const { sport, year, location } = req.query;

  const session = driver.session();
  try {
    let cypher = `MATCH (e:Event)`;
    let params = {};

    // Add filters if provided
    const conditions = [];
    if (sport) {
      conditions.push('e.sport = $sport');
      params.sport = sport;
    }
    if (year) {
      conditions.push('e.year = $year');
      params.year = year;
    }
    if (location) {
      conditions.push('toLower(e.location) CONTAINS toLower($location)');
      params.location = location;
    }

    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')}`;
    }

    cypher += ` RETURN e ORDER BY e.year DESC, e.name`;

    const result = await session.run(cypher, params);
    const events = result.records.map(record =>
      convertNeo4jIntegers(record.get('e').properties)
    );

    res.json(events);

  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  } finally {
    await session.close();
  }
});

// GET PAST EVENTS USING EVENT SERVICE
router.get('/past-events', async (req, res) => {
  const session = driver.session();
  try {
    const eventProperties = await listPastEvents(session);

    const events = eventProperties.map(rawProps => {
      const eventProps = convertNeo4jIntegers(rawProps);
      return {
        id: eventProps.uuid || Math.random().toString(36),
        title: eventProps.name,
        summary: eventProps.name,
        location: eventProps.location,
        roles: eventProps.roles,
        year: eventProps.year,
        eventType: eventProps.eventType,
        description: `${eventProps.eventType || 'Event'} - ${eventProps.year || 'Year not specified'}`,

        date: eventProps.date || null,
        start: eventProps.date || null
      };
    });

    res.json(events);

  } catch (err) {
    console.error('Failed to fetch past events:', err);
    res.status(500).json({ error: 'Past event fetch error' });
  } finally {
    await session.close();
  }
});

//events calendar
router.get('/calendar-events', async (req, res) => {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const apiKey = process.env.GOOGLE_API_KEY;
    const timeMin = new Date().toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&singleEvents=true&orderBy=startTime`;
    const response = await axios.get(url);

    const events = response.data.items.map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location,
      description: event.description
    }));

    res.json(events);
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    res.status(500).json({ error: 'Calendar fetch error' });
  }
});

module.exports = router;