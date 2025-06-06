const neo4j = require('neo4j-driver');

const fs = require('fs');
const path = require('path');


class GraphService {
  constructor(graphModel, driver) {
    this.graphModel = graphModel;
    this.driver = driver;
    this.graphName = 'peopleKinSport';
  }

  /**
   * Compute PageRank scores locally
   * @param {Array<Array<string>>} edges - Array of [source, target] pairs.
   * @param {Object} options - Algorithm options.
   * @param {number} options.dampingFactor - Damping factor.
   * @param {number} options.maxIterations - Maximum iterations.
   * @param {number} options.tolerance - Convergence tolerance.
   * @returns {Object} Map of node name to PageRank score.
   */
  computePageRankLocal(edges, { dampingFactor = 0.85, maxIterations = 20, tolerance = 0.0001 } = {}) {
    const nodes = new Set();
    for (const [s, t] of edges) {
      nodes.add(s);
      nodes.add(t);
    }

    const N = nodes.size;
    if (N === 0) return {};

    const neighbors = {};
    nodes.forEach(n => { neighbors[n] = new Set(); });
    for (const [s, t] of edges) {
      neighbors[s].add(t);
      neighbors[t].add(s); // treat edges as undirected
    }

    const outDegree = {};
    nodes.forEach(n => { outDegree[n] = neighbors[n].size || 1; });

    let ranks = {};
    nodes.forEach(n => { ranks[n] = 1 / N; });

    const dampingValue = (1 - dampingFactor) / N;

    for (let iter = 0; iter < maxIterations; iter++) {
      const newRanks = {};
      nodes.forEach(n => { newRanks[n] = dampingValue; });

      nodes.forEach(n => {
        const share = ranks[n] / outDegree[n];
        neighbors[n].forEach(m => {
          newRanks[m] += dampingFactor * share;
        });
      });

      let diff = 0;
      nodes.forEach(n => { diff += Math.abs(newRanks[n] - ranks[n]); });

      ranks = newRanks;
      if (diff < tolerance) break;
    }

    return ranks;
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
      // Fetch edges between people
      const result = await session.run(`
        MATCH (a:Person)-[:FRIENDS_WITH|PARTICIPATES_IN]-(b:Person)
        RETURN a.name AS source, b.name AS target
      `);

      const edges = result.records.map(r => [r.get('source'), r.get('target')]);

      const ranks = this.computePageRankLocal(edges, {
        dampingFactor,
        maxIterations,
        tolerance
      });

      const rows = Object.entries(ranks).map(([name, score]) => ({ name, score }));

      if (rows.length > 0) {


        await session.run(
          `UNWIND $rows AS row
           MATCH (p:Person {name: row.name})
           SET p[$prop] = row.score`,
          { rows, prop: writeProperty }
        );
        return {
          nodePropertiesWritten: rows.length,
          ranIterations: maxIterations,
          didConverge: true,
          writeProperty
        };      }
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
        const likeRel = record.get('l');
        const likedNode = record.get('liked');

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

        if (likeRel && likedNode) {
          if (!nodesMap.has(likedNode.identity.toString())) {
              nodesMap.set(likedNode.identity.toString(), mapNode(likedNode));
          }
          edges.push({
              data: {
                  id: likeRel.identity.toString(),
                  source: friend.identity.toString(),
                  target: likedNode.identity.toString(),
                  label: 'likes',
                  title: 'likes',
                  relationshipType: 'LIKES',
                  createdAt: likeRel.properties.createdAt,
                  ...likeRel.properties
              }
          });
      }
    });

    return {
        nodes: Array.from(nodesMap.values()),
        edges,
        totalCount: records.length
    };
  }

  /**
   * Build a graph for the organisation with the most PARTICIPATES_IN players
   * and include each player's LIKES one hop out
   */
  async getTopOrgWithLikes() {
    const records = await this.graphModel.getTopOrgWithLikes();

    const nodesMap = new Map();
    const edges = [];

    const mapNode = node => ({
      data: {
        id: node.identity.toString(),
        label: (node.properties.name || node.properties.email || node.labels[0]),
        name: node.properties.name || node.properties.email,
        image: node.properties.profileImage || this.getWikipediaImageUrl(node.properties.name || node.properties.email),
        profileImage: node.properties.profileImage || this.getWikipediaImageUrl(node.properties.name || node.properties.email),
        type: node.labels[0] ? node.labels[0].toLowerCase() : 'unknown',
        ...node.properties
      }
    });

    records.forEach(record => {
      const org = record.get('o');
      const player = record.get('p');
      const part = record.get('part');
      const likeRel = record.get('like');
      const liked = record.get('liked');

      if (org && !nodesMap.has(org.identity.toString())) {
        nodesMap.set(org.identity.toString(), mapNode(org));
      }
      if (player && !nodesMap.has(player.identity.toString())) {
        nodesMap.set(player.identity.toString(), mapNode(player));
      }
      if (liked && !nodesMap.has(liked.identity.toString())) {
        nodesMap.set(liked.identity.toString(), mapNode(liked));
      }

      if (part) {
        edges.push({ data: { id: part.identity.toString(), source: player.identity.toString(), target: org.identity.toString(), label: 'participates_in', title: 'participates in', relationshipType: 'PARTICIPATES_IN', ...part.properties } });
      }

      if (likeRel && liked) {
        edges.push({ data: { id: likeRel.identity.toString(), source: player.identity.toString(), target: liked.identity.toString(), label: 'likes', title: 'likes', relationshipType: 'LIKES', ...likeRel.properties } });
      }
    });

    return { nodes: Array.from(nodesMap.values()), edges };
  }

}

module.exports = GraphService;