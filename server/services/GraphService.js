const fs = require('fs');
const path = require('path');
const driver = require('../neo4j');
const Graph = require('../models/Graph')

class GraphService {
  constructor(graphModel, driver) {
    this.graphModel = graphModel;
    this.driver = driver;
    this.graphName = 'peopleKinSport';
  }

  async computeEmbeddings({ dim = 16, iterations = 10 } = {}) {
    const session = this.driver.session();
    await session.run(
      `CALL gds.fastRP.mutate(
         $name,
         {
           embeddingDimension: $dim,
           iterationWeights: [1.0,1.0,1.0,1.0],
           mutateProperty: 'emb',
           randomSeed: 42
         }
      )`,
      { name: this.graphName, dim }
    );
    await session.close();
  }

  async writeKnn({ topK = 5 } = {}) {
    const session = this.driver.session();
    await session.run(
      `CALL gds.knn.write(
         $name,
         {
           nodeLabels: ['Person'],
           nodeProperties: ['emb'],
           topK: $k,
           writeRelationshipType: 'SIMILAR_PERSON',
           writeProperty: 'score'
         }
      )`,
      { name: this.graphName, k: topK }
    );
    await session.close();
  }

  async getSimilar(name, topK = 5) {
    const session = this.driver.session();
    const result = await session.run(
      `
      MATCH (p:Person {name:$name})
      WITH id(p) AS source
      CALL gds.knn.stream(
        $name,
        {
          sourceNode: source,
          nodeLabels: ['Person'],
          nodeProperties: ['emb'],
          k: $k
        }
      )
      YIELD nodeId, score
      RETURN gds.util.asNode(nodeId).name AS name, score
      ORDER BY score DESC
      `,
      { name, k: topK }
    );
    await session.close();
    return result.records.map(r => ({
      name: r.get('name'),
      score: r.get('score')
    }));
  }

  async buildGraph(limit = 100, filterByType = null) {
    const records = await this.graphModel.getAllConnections(
      Number.isInteger(limit) ? limit : parseInt(limit, 10)
    );
    const nodesMap = new Map();
    const edges = [];
    records.forEach(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');
      if (filterByType && r.type !== filterByType) return;
      const mapNode = node => ({
        data: {
          id: node.identity.toString(),
          label: node.properties.name || node.labels[0],
          image: node.properties.profileImage || './images/logo-default-profile.png',
          ...node.properties
        }
      });
      if (!nodesMap.has(n.identity.toString())) nodesMap.set(n.identity.toString(), mapNode(n));
      if (!nodesMap.has(m.identity.toString())) nodesMap.set(m.identity.toString(), mapNode(m));
      edges.push({ data: {
        id: r.identity.toString(),
        source: n.identity.toString(),
        target: m.identity.toString(),
        label: r.type.replace(/_/g, ' ').toLowerCase(),
        title: r.type.replace(/_/g, ' ').toLowerCase()
      }});
    });
    return { nodes: Array.from(nodesMap.values()), edges };
  }

  async getPageRankScoresFromProperty() {
    const session = this.driver.session();
    const result = await session.run(
      `MATCH (p:Person)
       WHERE exists(p.pagerank)
       RETURN p.name AS name, p.pagerank AS score
       ORDER BY score DESC
       LIMIT 20`
    );
    await session.close();
    return result.records.map(r => ({
      name: r.get('name'),
      score: r.get('score')
    }));
  }

  async detectCommunities() {
    const session = this.driver.session();
    const result = await session.run(
      `CALL gds.louvain.stream($name)
       YIELD nodeId, communityId
       RETURN gds.util.asNode(nodeId).name AS name, communityId
       ORDER BY communityId`,
      { name: this.graphName }
    );
    await session.close();
    return result.records.map(r => ({
      name: r.get('name'),
      communityId: r.get('communityId')
    }));
  }

  async exportEdgesToCSV(filePath = path.join(__dirname, '../../scripts/data/edges.csv')) {
    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (a:Person)-[:FRIENDS_WITH|PARTICIPATES_IN]-(b:Person)
        RETURN a.name AS source, b.name AS target
      `);

      const rows = result.records.map(r => `${r.get('source')},${r.get('target')}`);
      const content = ['source,target', ...rows].join('\n');

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Exported edges to ${filePath}`);
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Failed to export edges to CSV:', err);
      throw err;
    } finally {
      await session.close();
    }
  }

}

module.exports = GraphService;