async function listPastEvents(session) {
  const result = await session.run(
    'MATCH (e:Event) RETURN e ORDER BY e.date DESC'
  );
  return result.records.map(r => r.get('e').properties);
}

module.exports = { listPastEvents };
