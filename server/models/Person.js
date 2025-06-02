class Person {
    constructor(driver) {
        this.driver = driver;
    }

    async createOrUpdateUser({ username, email, passwordHash, roles, location, bio, profileImage }) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MERGE (u:Person { email: $email })
                ON CREATE SET u.username = $username, 
                             u.passwordHash = $passwordHash,   
                             u.roles = $roles, 
                             u.uuid = randomUUID(),
                             u.location = $location,
                             u.bio = $bio,
                             u.profileImage = $profileImage
                ON MATCH SET u.username = $username, 
                            u.passwordHash = coalesce($passwordHash, u.passwordHash), 
                            u.roles = $roles,
                            u.location = $location,
                            u.bio = $bio,
                            u.profileImage = $profileImage
                RETURN u
                `,
                { username, email, passwordHash, roles, location, bio, profileImage }
            );
            return result.records[0].get('u').properties;
        } finally {
            await session.close();
        }
    }

    async createOrUpdateAthlete({
        name,
        sport,
        nationality,
        gender,
        profileImage,
        birthDate
    }) {
        const session = this.driver.session();
        try {
            const newRole = 'athlete';
            const result = await session.run(
                `
                MERGE (p:Person {name: $name})
                ON CREATE SET
                  p:Athlete = true,
                  p.roles = [$newRole],
                  p.sport = $sport,
                  p.nationality = $nationality,
                  p.gender = $gender,
                  p.profileImage = $profileImage,
                  p.birthDate = $birthDate
                ON MATCH SET
                  p.sport         = CASE WHEN p.sport         <> $sport         THEN $sport         ELSE p.sport         END,
                  p.nationality   = CASE WHEN p.nationality   <> $nationality   THEN $nationality   ELSE p.nationality   END,
                  p.gender        = CASE WHEN p.gender        <> $gender        THEN $gender        ELSE p.gender        END,
                  p.profileImage  = CASE WHEN p.profileImage  <> $profileImage  THEN $profileImage  ELSE p.profileImage  END,
                  p.birthDate     = CASE WHEN p.birthDate     <> $birthDate     THEN $birthDate     ELSE p.birthDate     END,
                  p.roles         = CASE WHEN NOT $newRole IN p.roles THEN p.roles + $newRole ELSE p.roles END
                RETURN p
                `,
                { name, sport, nationality, gender, profileImage, birthDate, newRole }
            );
            return result.records[0].get('p').properties;
        } finally {
            await session.close();
        }
    }

    async getAthletes({ random = false, limit = 100 }) {
        const session = this.driver.session();
        try {
            const safeLimit = Number.isInteger(limit) ? limit : parseInt(limit, 10);

            let query = `
            MATCH (p:Person)
            WHERE 'athlete' IN p.roles
            RETURN p
            LIMIT toInteger($limit)
          `;

            if (random) {
                query = `
              MATCH (p:Person)
              WHERE 'athlete' IN p.roles
              RETURN p
              ORDER BY rand()
              LIMIT toInteger($limit)
            `;
            }

            const result = await session.run(query, { limit: safeLimit });
            return result.records.map(r => r.get('p').properties);
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
                RETURN p 
                LIMIT 10
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

    async getPasswordHashByEmail(email) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                'MATCH (p:Person {email: $email}) WHERE p.passwordHash IS NOT NULL RETURN p.passwordHash AS hash',
                { email }
            );
            if (result.records.length === 0) return null;
            return result.records[0].get('hash');
        } finally {
            await session.close();
        }
    }


    async getLikedAthletesByUser(identifier) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (user:Person)-[:LIKES]->(athlete:Person)
                WHERE (user.username = $identifier OR user.email = $identifier)
                AND 'athlete' IN athlete.roles
                RETURN user, athlete
                LIMIT 5
                `,
                { identifier }
            );
            
            const nodes = [];
            const edges = [];
            
            result.records.forEach(record => {
                const user = record.get('user');
                const athlete = record.get('athlete');
                
                // Add user node (avoid duplicates)
                if (!nodes.find(n => n.data.id === user.properties.uuid || user.properties.username)) {
                    nodes.push({
                        data: {
                            id: user.properties.uuid || user.properties.username,
                            label: user.properties.name || user.properties.username,
                            type: 'user',
                            image: user.properties.profileImage,
                            ...user.properties
                        }
                    });
                }
                
                // Add athlete node (avoid duplicates)
                if (!nodes.find(n => n.data.id === athlete.properties.uuid)) {
                    nodes.push({
                        data: {
                            id: athlete.properties.uuid,
                            label: athlete.properties.name,
                            type: 'athlete',
                            sport: athlete.properties.sport,
                            nationality: athlete.properties.nationality,
                            gender: athlete.properties.gender,
                            image: athlete.properties.profileImage,
                            birthDate: athlete.properties.birthDate,
                            roles: athlete.properties.roles,
                            ...athlete.properties
                        }
                    });
                }
                
                // Add edge
                edges.push({
                    data: {
                        source: user.properties.uuid || user.properties.username,
                        target: athlete.properties.uuid,
                        relationship: 'LIKES'
                    }
                });
            });
            
            return { nodes, edges };
        } finally {
            await session.close();
        }
    }

    async likePlayer(username, playerName) {
        const session = this.driver.session();
        try {
            console.log('[LIKE PLAYER] Attempting to like:', { username, playerName });
            const result = await session.run(
                `
                MATCH (u:Person {username: $username})
                MATCH (p:Person {name: $playerName})
                MERGE (u)-[r:LIKES]->(p)
                RETURN u, r, p
                `,
                { username, playerName }
            );
            if (result.records.length === 0) {
                console.warn('[LIKE PLAYER] No match for user or athlete!');
            } else {
                console.log('[LIKE PLAYER] Result:', result.records.map(r => ({
                    user: r.get('u').properties,
                    athlete: r.get('p').properties,
                    rel: r.get('r').type
                })));
            }
        } catch (err) {
            console.error('[LIKE PLAYER] Error:', err);
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
