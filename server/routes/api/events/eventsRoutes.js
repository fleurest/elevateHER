const router = require('express').Router();

router.get('/calendar-events', async (req, res) => {
  try {
    const calendarId = 'c_e0a01a47aff1ecc1da77e5822cd3d63bc054f441ae359c05fae0552aee58c3cc@group.calendar.google.com';
    const events = await listUpcomingEvents(calendarId);
    res.json(events);
  } catch (err) {
    console.error('Failed to fetch calendar events:', err);
    res.status(500).json({ error: 'Calendar fetch error' });
  }
});

router.get('/past-events', async (req, res) => {
  try {
    const events = await listPastEvents();
    res.json(events);
  } catch (err) {
    console.error('Failed to fetch past events:', err);
    res.status(500).json({ error: 'Past event fetch error' });
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
        summary: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
      }));
  
      res.json(events);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      res.status(500).json({ error: 'Calendar fetch error' });
    }
  });
  
module.exports = router;