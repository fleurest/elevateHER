class Graph {
    constructor(driver) {
      this.driver = driver;
    }
  
    async getParticipationGraph(limit = 25) {
      const session = this.driver.session();
      try {
        const result = await session.run(
          'MATCH p=()-[:PARTICIPATES_IN]->() RETURN p LIMIT $limit',
          { limit: parseInt(limit) }
        );
        return result.records.map(record => record.get('p'));
      } finally {
        await session.close();
      }
    }

    async getBasicConnections(limit = 10) {
        const session = this.driver.session();
        try {
          const result = await session.run(
            'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT $limit',
            { limit }
          );
          return result.records;
        } finally {
          await session.close();
        }
      }
      
      async getAllConnections(limit = 100) {
        const session = this.driver.session();
        try {
          const result = await session.run(
            'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT $limit',
            { limit: parseInt(limit) }
          );
          return result.records;
        } finally {
          await session.close();
        }
      }
      
  }
  
  
  module.exports = Graph;
  