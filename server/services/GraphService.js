const neo4j = require('neo4j-driver');

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

  /**
   * Generate Wikipedia image URL for a person's name
   * @param {string} name - Person's name
   * @returns {string} Wikipedia image URL
   */
  getWikipediaImageUrl(name) {
    if (!name) return null;
    const encodedName = encodeURIComponent(name.replace(/ /g, '_'));
    return `https://en.wikipedia.org/wiki/Special:Redirect/file/${encodedName}.jpg`;
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
      
      const mapNode = node => {
        const name = node.properties.name;
        const profileImage = node.properties.profileImage;
        
        return {
          data: {
            id: node.identity.toString(),
            label: name || node.labels[0],
            name: name,
            image: profileImage || this.getWikipediaImageUrl(name),
            profileImage: profileImage || this.getWikipediaImageUrl(name),
            type: node.labels[0]?.toLowerCase() || 'unknown',
            ...node.properties
          }
        };
      };
      
      if (!nodesMap.has(n.identity.toString())) nodesMap.set(n.identity.toString(), mapNode(n));
      if (!nodesMap.has(m.identity.toString())) nodesMap.set(m.identity.toString(), mapNode(m));
      edges.push({
        data: {
          id: r.identity.toString(),
          source: n.identity.toString(),
          target: m.identity.toString(),
          label: r.type.replace(/_/g, ' ').toLowerCase(),
          title: r.type.replace(/_/g, ' ').toLowerCase()
        }
      });
    });
    return { nodes: Array.from(nodesMap.values()), edges };
  }

  // ========== PAGERANK FUNCTIONALITY ==========
  
  /**
   * Get PageRank scores from stored property - ENHANCED VERSION
   * @param {Object} options - Options object
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.threshold - Minimum score threshold
   * @returns {Promise<Array>} Array of PageRank results
   */
  async getPageRankScores({ limit = 20, threshold = 0.0 } = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Person)
         WHERE p.pagerank IS NOT NULL AND p.pagerank >= $threshold
         RETURN p.name AS name, 
                p.pagerank AS score,
                p.profileImage AS profileImage,
                p.sport AS sport,
                p.nationality AS nationality,
                p
         ORDER BY score DESC
         LIMIT $limit`,
        { limit: neo4j.int(limit), threshold }
      );
      
      return result.records.map(r => {
        const person = r.get('p');
        const name = r.get('name');
        const profileImage = r.get('profileImage');
        
        return {
          name,
          score: r.get('score'),
          sport: r.get('sport'),
          nationality: r.get('nationality'),
          profileImage: profileImage || this.getWikipediaImageUrl(name),
          id: person.identity.toString(),
          ...person.properties
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate PageRank using GDS library
   * @param {Object} options - PageRank calculation options
   * @returns {Promise<Object>} Calculation results
   */
  async calculatePageRank({ 
    maxIterations = 20, 
    dampingFactor = 0.85, 
    tolerance = 0.0001,
    writeProperty = 'pagerank'
  } = {}) {
    const session = this.driver.session();
    
    try {
      await this.ensureGraphProjection();
      
      // Calculate PageRank and write to neo4j
      const result = await session.run(
        `CALL gds.pageRank.write($graphName, {
           maxIterations: $maxIterations,
           dampingFactor: $dampingFactor,
           tolerance: $tolerance,
           writeProperty: $writeProperty
         })
         YIELD nodePropertiesWritten, ranIterations, didConverge`,
        { 
          graphName: this.graphName,
          maxIterations: neo4j.int(maxIterations),
          dampingFactor,
          tolerance,
          writeProperty
        }
      );
      
      const record = result.records[0];
      return {
        nodePropertiesWritten: record.get('nodePropertiesWritten').toNumber(),
        ranIterations: record.get('ranIterations').toNumber(),
        didConverge: record.get('didConverge'),
        writeProperty
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Ensure graph projection exists for GDS operations
   */
  async ensureGraphProjection() {
    const session = this.driver.session();
    
    try {
      // Check if projection exists
      const checkResult = await session.run(
        `CALL gds.graph.exists($graphName)
         YIELD exists`,
        { graphName: this.graphName }
      );
      
      const exists = checkResult.records[0].get('exists');
      
      if (!exists) {
        // Create graph projection
        await session.run(
          `CALL gds.graph.project(
             $graphName,
             ['Person', 'Organization'],
             {
               FRIENDS_WITH: { orientation: 'UNDIRECTED' },
               PARTICIPATES_IN: { orientation: 'UNDIRECTED' },
               LIKES: { orientation: 'UNDIRECTED' }
             }
           )`,
          { graphName: this.graphName }
        );
        console.log(`Created graph projection: ${this.graphName}`);
      }
    } finally {
      await session.close();
    }
  }

  // ========== EXISTING METHODS (UNCHANGED) ==========

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

  /**
   * Get participation graph - delegated to model
   */
  async getParticipationGraph(limit = 25) {
    return await this.graphModel.getParticipationGraph(limit);
  }

  /**
   * Get liked entities for a user by email
   * @param {string} email - User's email
   * @param {Object} options - Options object
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.type - Filter by type ('person', 'organization', or null for all)
   * @returns {Promise<Object>} Graph structure with nodes and edges
   */
  async getLikedByEmail(email, { limit = 50, type = null } = {}) {
    let records;

    switch (type) {
      case 'person':
        records = await this.graphModel.getLikedPeopleByEmail(email, limit);
        break;
      case 'organization':
        records = await this.graphModel.getLikedOrganizationsByEmail(email, limit);
        break;
      default:
        records = await this.graphModel.getLikedByEmail(email, limit);
    }

    const nodesMap = new Map();
    const edges = [];

    records.forEach(record => {
      const user = record.get('user');
      const target = record.get('target') || record.get('person') || record.get('org');
      const relationship = record.get('r');

      const mapNode = node => {
        const name = node.properties.name || node.properties.email;
        const profileImage = node.properties.profileImage;
        
        return {
          data: {
            id: node.identity.toString(),
            label: name || node.labels[0],
            name: name,
            image: profileImage || this.getWikipediaImageUrl(name),
            profileImage: profileImage || this.getWikipediaImageUrl(name),
            type: node.labels[0]?.toLowerCase() || 'unknown',
            ...node.properties
          }
        };
      };

      // Add user node
      if (!nodesMap.has(user.identity.toString())) {
        nodesMap.set(user.identity.toString(), mapNode(user));
      }

      // Add target node
      if (!nodesMap.has(target.identity.toString())) {
        nodesMap.set(target.identity.toString(), mapNode(target));
      }

      // Add relationship edge
      edges.push({
        data: {
          id: relationship.identity.toString(),
          source: user.identity.toString(),
          target: target.identity.toString(),
          label: 'likes',
          title: 'likes',
          relationshipType: 'LIKES',
          createdAt: relationship.properties.createdAt,
          ...relationship.properties
        }
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges,
      totalCount: records.length
    };
  }

  /**
   * Get all liked entities across all users
   * @param {Object} options - Options object
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Object>} Graph structure with nodes and edges
   */
  async getAllLikes({ limit = 50 } = {}) {
    const records = await this.graphModel.getAllLikes(limit);

    const nodesMap = new Map();
    const edges = [];

    records.forEach(record => {
      const user = record.get('user');
      const target = record.get('target');
      const relationship = record.get('r');

      const mapNode = node => {
        const name = node.properties.name || node.properties.email;
        const profileImage = node.properties.profileImage;

        return {
          data: {
            id: node.identity.toString(),
            label: name || node.labels[0],
            name: name,
            image: profileImage || this.getWikipediaImageUrl(name),
            profileImage: profileImage || this.getWikipediaImageUrl(name),
            type: node.labels[0]?.toLowerCase() || 'unknown',
            ...node.properties
          }
        };
      };

      if (!nodesMap.has(user.identity.toString())) {
        nodesMap.set(user.identity.toString(), mapNode(user));
      }

      if (!nodesMap.has(target.identity.toString())) {
        nodesMap.set(target.identity.toString(), mapNode(target));
      }

      edges.push({
        data: {
          id: relationship.identity.toString(),
          source: user.identity.toString(),
          target: target.identity.toString(),
          label: 'likes',
          title: 'likes',
          relationshipType: 'LIKES',
          createdAt: relationship.properties.createdAt,
          ...relationship.properties
        }
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges,
      totalCount: records.length
    };
  }
  
  /**
   * Get liked entities summary for a user
   * @param {string} email - User's email
   * @returns {Promise<Object>} Summary of liked entities
   */
  async getLikedSummary(email) {
    const [allLiked, likedPeople, likedOrgs] = await Promise.all([
      this.graphModel.getLikedByEmail(email, 1),
      this.graphModel.getLikedPeopleByEmail(email, 100),
      this.graphModel.getLikedOrganizationsByEmail(email, 100)
    ]);

    return {
      totalLiked: likedPeople.length + likedOrgs.length,
      likedPeople: likedPeople.length,
      likedOrganizations: likedOrgs.length,
      hasLikes: (likedPeople.length + likedOrgs.length) > 0
    };
  }

  /**
   * Get friends for a user by email
   * @param {string} email - User's email
   * @param {Object} options - Options object
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Object>} Graph structure with nodes and edges
   */
  async getFriendsByEmail(email, { limit = 50 } = {}) {
    const records = await this.graphModel.getFriendsByEmail(email, limit);

    const nodesMap = new Map();
    const edges = [];

    records.forEach(record => {
        const user = record.get('user');
        const friend = record.get('friend');
        const relationship = record.get('r');

        const mapNode = node => {
          const name = node.properties.name || node.properties.email;
          const profileImage = node.properties.profileImage;
          
          return {
            data: {
              id: node.identity.toString(),
              label: name || node.labels[0],
              name: name,
              image: profileImage || this.getWikipediaImageUrl(name),
              profileImage: profileImage || this.getWikipediaImageUrl(name),
              type: node.labels[0]?.toLowerCase() || 'unknown',
              ...node.properties
            }
          };
        };

        // Add user node
        if (!nodesMap.has(user.identity.toString())) {
            nodesMap.set(user.identity.toString(), mapNode(user));
        }

        // Add friend node
        if (!nodesMap.has(friend.identity.toString())) {
            nodesMap.set(friend.identity.toString(), mapNode(friend));
        }

        // Add friendship edge
        edges.push({
            data: {
                id: relationship.identity.toString(),
                source: user.identity.toString(),
                target: friend.identity.toString(),
                label: 'friends',
                title: 'friends',
                relationshipType: 'FRIENDS_WITH',
                createdAt: relationship.properties.createdAt,
                ...relationship.properties
            }
        });
    });

    return {
        nodes: Array.from(nodesMap.values()),
        edges,
        totalCount: records.length
    };
  }

}

module.exports = GraphService;