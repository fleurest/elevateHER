async function listPastEvents(session) {
    const result = await session.run(
      'MATCH (e:Event) WHERE e.date < date() RETURN e ORDER BY e.date DESC LIMIT 25'
    );
    return result.records.map(r => r.get('e').properties);
  }
  
  module.exports = { listPastEvents };
  