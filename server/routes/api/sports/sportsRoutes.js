const router = require('express').Router();
const { driver } = require('../../../neo4j');

// Create or update a sport
router.post('/create', async (req, res) => {
  const { name, type, category, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Sport name is required' });
  }

  const session = driver.session();
  try {
    const cypher = `
      MERGE (s:Sport {name: $name})
      ON CREATE SET 
        s.type = $type,
        s.category = $category,
        s.description = $description,
        s.label = 'Sport',
        s.createdAt = datetime()
      ON MATCH SET
        s.type = COALESCE($type, s.type),
        s.category = COALESCE($category, s.category),
        s.description = COALESCE($description, s.description),
        s.updatedAt = datetime()
      RETURN s
    `;

    const result = await session.run(cypher, {
      name,
      type: type || 'Sport',
      category: category || null,
      description: description || null
    });

    res.json({ 
      message: `Sport ${name} created/updated successfully`,
      sport: result.records[0]?.get('s').properties 
    });

  } catch (err) {
    console.error('Error creating sport:', err);
    res.status(500).json({ error: 'Failed to create sport' });
  } finally {
    await session.close();
  }
});

// Create new sport node if it doesn't exist and not an alternate name in another Sport node
router.post('/', async (req, res, next) => {
  const { name, alternateName, iocDisciplineCode } = req.body;


  if (!name || !Array.isArray(alternateName) || alternateName.length === 0 || !iocDisciplineCode) {
    return res.status(400).json({
      message:
        'Missing required fields (name, alternateName [as nonempty array], or iocDisciplineCode).',
    });
  }

  const session = driver.session();
  try {
    // Check if a Sport with this name OR with this name in its alternateName array already exists
    const checkResult = await session.run(
      `
      MATCH (s:Sport)
      WHERE s.name = $name
         OR $name IN s.alternateName
      RETURN s
      LIMIT 1
      `,
      { name }
    );

    if (checkResult.records.length > 0) {
      // Already exists → conflict
      return res.status(409).json({ message: `Sport "${name}" already exists (by name or alternateName).` });
    }

    // Create new Sport node
    await session.run(
      `
      CREATE (s:Sport {
        name: $name,
        alternateName: $alternateName,
        iocDisciplineCode: $iocDisciplineCode
      })
      `,
      { name, alternateName, iocDisciplineCode }
    );

    return res.status(201).json({ message: `Sport "${name}" created successfully.` });
  } catch (err) {
    console.error('❗️ Error in POST /sport:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    await session.close();
  }
});

// Get all sports
router.get('/', async (req, res, next) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (s:Sport)
       RETURN s.name AS name, s.alternateName AS alternateName, s.iocDisciplineCode AS iocDisciplineCode
       ORDER BY s.name`
    );
    const sports = result.records.map(r => ({
      name: r.get('name'),
      alternateName: r.get('alternateName'),
      iocDisciplineCode: r.get('iocDisciplineCode'),
    }));
    return res.status(200).json(sports);
  } catch (err) {
    console.error('❗️ Error in GET /sports:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    await session.close();
  }
});

module.exports = router;