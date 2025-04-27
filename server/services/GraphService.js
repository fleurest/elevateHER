class GraphService {
  constructor(graphModel) {
    this.graphModel = graphModel;
    this.driver = graphModel.driver;
    this.graphName = 'peopleKinSport';
  }

  async projectGraph() {
    const session = this.driver.session();
    try {
      await session.run(`CALL gds.graph.drop($name, false)`, { name: this.graphName });
    } catch (_) {
    }
    await session.run(
      `CALL gds.graph.project(
         $name,
         'Person',
         {
           PARTICIPATES_IN: {
             type: 'PARTICIPATES_IN',
             orientation: 'UNDIRECTED'
           }
         }
      )`,
      { name: this.graphName }
    );
    await session.close();
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
}

module.exports = GraphService;