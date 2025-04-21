class Person {
    constructor(driver) {
        this.driver = driver;
    }

    static queries = {
        createOrUpdate: `
            MERGE (p:Person {name: $name})
            ON CREATE SET
              p.sport = $sport,
              p.uuid = randomUUID()
            ON MATCH SET
              p.sport = coalesce($sport, p.sport)
            RETURN p
        `
    };

    async createOrUpdate({ name, sport }) {
        const session = this.driver.session();
        try {
            const result = await session.run(Person.queries.createOrUpdate, { name, sport });
            return result.records[0].get('p').properties;
        } finally {
            await session.close();
        }
    }

    async updateById(id, { name, sport, description }) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (p)
                WHERE id(p) = $id
                SET p:Person,
                    p.name = $name,
                    p.sport = $sport,
                    p.description = $description

                MERGE (s:Sport {name: $sport})
                MERGE (p)-[:PARTICIPATES_IN]->(s)
                RETURN p
                `,
                { id: parseInt(id), name, sport, description }
            );

            return result.records[0]?.get('p').properties;
        } finally {
            await session.close();
        }
    }

    async searchByName({ query, sport }) {
        const session = this.driver.session();
        try {
            const cypher = `
                MATCH (p:Person)
                WHERE toLower(p.name) CONTAINS toLower($query)
                ${sport ? 'AND toLower(p.sport) = toLower($sport)' : ''}
                RETURN p LIMIT 10
            `;
            const result = await session.run(cypher, { query, sport });
            return result.records.map(r => r.get('p'));
        } finally {
            await session.close();
        }
    }

    async suggestSimilarNames(query) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (p:Person)
                WITH p, apoc.text.sorensenDiceSimilarity(toLower(p.name), toLower($query)) AS similarity
                WHERE similarity > 0.1
                RETURN p ORDER BY similarity DESC LIMIT 5
                `,
                { query }
            );
            return result.records.map(r => r.get('p'));
        } finally {
            await session.close();
        }
    }

    async getLikedPlayersByUser(username) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (p:Person {username: $username})-[:LIKED]->(p:Person)
                RETURN p
                LIMIT 5
                `,
                { username }
            );
            return result.records.map(r => r.get('p'));
        } finally {
            await session.close();
        }
    }

    async likePlayer(username, playerName) {
        const session = this.driver.session();
        try {
            await session.run(
                `
                MERGE (u:User {username: $username})
                MERGE (p:Person {name: $playerName})
                MERGE (u)-[:LIKED]->(p)
                `,
                { username, playerName }
            );
        } finally {
            await session.close();
        }
    }

    // friend request
    async sendFriendRequest(fromUsername, toUsername) {
        const session = driver.session();

        try {
            const query = `
        MATCH (p1:Person {username: $fromUsername})
        MATCH (p2:Person {username: $toUsername})
        WHERE p1 <> p2
        MERGE (p1)-[r:FRIENDS_WITH]->(p2)
        SET r.status = "pending", r.requestedAt = datetime()
      `;
            await session.run(query, { fromUsername, toUsername });
        } finally {
            await session.close();
        }
    }

    // accept friend request
    async acceptFriendRequest(fromUsername, toUsername) {
        const session = this.driver.session();

        try {
            const query = `
        MATCH (p1:Person {username: $fromUsername})- [r:FRIENDS_WITH {status: "pending"}] -> (p2:Person {username: $toUsername})
        SET r.status = "accepted", r.acceptedAt = datetime()
      `;
            await session.run(query, { fromUsername, toUsername });
        } finally {
            await session.close();
        }
    }

    // incoming pending requests
    async getIncomingFriendRequests(username) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (other:Person)-[r:FRIENDS_WITH {status: "pending"}]->(me:Person {username: $username})
        RETURN other.username AS from
      `, { username });

            return result.records.map(rec => rec.get('from'));
        } finally {
            await session.close();
        }
    }

    // outgoing pending requests
    async getOutgoingFriendRequests(username) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (me:Person {username: $username})-[r:FRIENDS_WITH {status: "pending"}]->(other:Person)
        RETURN other.username AS to
      `, { username });

            return result.records.map(rec => rec.get('to'));
        } finally {
            await session.close();
        }
    }

    // accepted friends
    async getAcceptedFriends(username) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (me:Person {username: $username})-[r:FRIENDS_WITH {status: "accepted"}]->(other:Person)
        RETURN other.username AS friend
      `, { username });

            return result.records.map(rec => rec.get('friend'));
        } finally {
            await session.close();
        }
    }

    
    async searchUsersByName(query) {
        const session = driver.session();
        try {
          const cypher = `
            MATCH (p:Person)
            WHERE toLower(p.name) CONTAINS toLower($query)
              AND "user" IN p.roles
            RETURN p
          `;
          const result = await session.run(cypher, { query });
          return result.records.map(record => {
            const node = record.get('p');
            return {
              id: node.identity.toNumber(),
              ...node.properties
            };
          });
        } finally {
          await session.close();
        }
      }

      async getSuggestedUsers(excludeUsername, limit = 10) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (p:Person)
                WHERE 'user' IN p.roles
                  AND p.username <> $excludeUsername
                  AND NOT EXISTS {
                    MATCH (:Person {username: $excludeUsername})-[:FRIENDS_WITH]-(:Person {username: p.username})
                  }
                RETURN p
                LIMIT $limit
                `,
                { excludeUsername, limit: neo4j.int(limit) }
            );
            return result.records.map(record => record.get('p').properties);
        } finally {
            await session.close();
        }
    }
}

module.exports = Person;
