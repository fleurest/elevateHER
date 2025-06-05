const bcrypt = require('bcrypt');
const neo4j = require('neo4j-driver');

class PersonService {
    constructor(personModel, driver) {
        this.personModel = personModel;
        this.driver = driver;
    }

    validatePersonData(data) {
        if (!data.name || !data.sport) {
            throw new Error('Name and sport are required');
        }
    }

    async createOrUpdatePerson(data) {
        this.validatePersonData(data);
        const cleaned = {
            name: data.name.trim(),
            sport: data.sport.trim(),
            nationality: data.nationality || '',
            gender: data.gender || '',
            profileImage: data.profileImage || null,
            birthDate: data.birthDate || null
        };
        return await this.personModel.createOrUpdateAthlete(cleaned);
    }

    async createOrUpdateUser(data) {
        return this.personModel.createOrUpdateUser(data);
    }

    async getPasswordHashByEmail(email) {
        return this.personModel.getPasswordHashByEmail(email);
    }


    async updateGoogleIdByEmail(email, googleId) {
        const session = this.driver.session();
        try {
            await session.run(
                'MATCH (p:Person {email:$email}) SET p.googleId = $googleId',
                { email, googleId }
            );
        } finally {
            await session.close();
        }
    }

    async authenticateUser(email, password) {
        const hash = await this.getPasswordHashByEmail(email);
        if (!hash) return false;
        return bcrypt.compare(password, hash);
      }

    async getTopUsers(limit = 5) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (p:Person)
             WHERE p.roles IS NOT NULL AND 'user' IN p.roles
             RETURN p
             ORDER BY p.name
             LIMIT $limit`,
                { limit: neo4j.int(limit) }
            );
            return result.records.map(r => r.get('p').properties);
        } catch (error) {
            console.error('[SERVICE] Error fetching top users:', error);
            return [];
        } finally {
            await session.close();
        }
    }

    async usernameExists(username) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                'MATCH (p:Person {username:$username}) RETURN count(p) AS cnt',
                { username }
            );
            return result.records[0].get('cnt').toNumber() > 0;
        } finally {
            await session.close();
        }
    }

    async findByGoogleId(googleId) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                'MATCH (p:Person {googleId:$googleId}) RETURN p',
                { googleId }
            );
            if (!result.records.length) return null;
            return result.records[0].get('p').properties;
        } finally {
            await session.close();
        }
    }

    async findByEmail(email) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                'MATCH (p:Person {email:$email}) RETURN p',
                { email }
            );
            if (!result.records.length) return null;
            return result.records[0].get('p').properties;
        } finally {
            await session.close();
        }
    }

    async generateUsernameFromEmail(email) {
        const { sanitizeUsername } = require('../utils/inputSanitizers');
        const prefix = sanitizeUsername(email.split('@')[0].toLowerCase());
        let username = prefix;
        let counter = 0;
        while (await this.usernameExists(username)) {
            counter += 1;
            username = `${prefix}${counter}`;
        }
        return username;
    }

    async createUser({
        username: maybeUsername,
        email,
        passwordHash = null,
        googleId = null,
        name = null,
        roles = ['user'],
    }) {
        const username = maybeUsername || await this.generateUsernameFromEmail(email);

        const session = this.driver.session();
        try {
            const result = await session.run(
                `CREATE (p:Person {
               uuid:         randomUUID(),
               username:     $username,
               email:        $email,
               name:         $name,
               passwordHash: $passwordHash,
               googleId:     $googleId,
               roles:        $roles,
               createdAt:    datetime()
             }) RETURN p`,
                { username, email, name, passwordHash, googleId, roles }
            );
            return result.records[0].get('p').properties;
        } finally {
            await session.close();
        }
    }

    async getFriendsForUser(identifier, limit = 4) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (p:Person)
                WHERE p.username = $identifier OR p.email = $identifier OR p.uuid = $identifier
                MATCH (p)-[:FRIENDS_WITH]-(friend:Person)
                WHERE 'user' IN friend.roles
                RETURN friend
                ORDER BY rand()
                LIMIT $limit
                `,
                { identifier, limit: neo4j.int(limit) }
            );
    
            return result.records.map(record => {
                const node = record.get('friend');
                return {
                    username: node.properties.username,
                    profileImage: node.properties.profileImage || null,
                    email: node.properties.email || null,
                    uuid: node.properties.uuid || null,
                };
            });
        } finally {
            await session.close();
        }
    }
    

    async getSuggestedUsers(currentUsername) {
        const session = this.driver.session();
        const query = `
          MATCH (p:Person)
          WHERE 'user' IN p.roles AND p.username <> $username
          RETURN p
          LIMIT 10
        `;

        try {
            const result = await session.run(query, { username: currentUsername });
            return result.records.map(record => record.get('p').properties);
        } finally {
            await session.close();
        }
    }

    async getRandomPlayers(limit = 5) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (p:Person)
             WHERE 'athlete' IN p.roles
             WITH p, rand() AS r
             RETURN p ORDER BY r LIMIT $limit`,
                { limit: neo4j.int(limit) }
            );
            return result.records.map(record => record.get('p').properties);
        } finally {
            await session.close();
        }
    }

    async linkAthleteToOrg(athleteName, organisationName, sport = "unknown", sportLabel = "Sport") {
        const session = this.driver.session();
        try {
            await session.run(
                `
                MERGE (a:Person {name: $athleteName})
                MERGE (t:Organisation {normalizedName: toLower(REPLACE($organisationName, ' ', '-'))})
                  ON CREATE SET t.name = $organisationName,
                                t.roles = ['team'],
                                t.description = 'Auto-created from athlete pipeline'
                MERGE (s:Sport {name: $sport})
                  ON CREATE SET s.label = $sportLabel
                MERGE (a)-[:PARTICIPATES_IN]->(t)
                MERGE (t)-[:PARTICIPATES_IN]->(s)
                `,
                { athleteName, organisationName, sport, sportLabel }
            );

        } finally {
            await session.close();
        }
    }

    // Search athletes by name with optional sport filter
    async searchByName({ query, sport }) {
        return this.personModel.searchByName({ query, sport });
    }

    // Suggest similar athlete names when no direct match is found
    async suggestSimilarNames(query) {
        return this.personModel.suggestSimilarNames(query);
    }

    async searchUsersByName(q) { return this.personModel.searchByName({ query: q, sport: null }) }

    async listAthletes({ random = false, athleteCount = 5 }) {
        return this.personModel.getAthletes({ random, limit: athleteCount });
    }


    async removeAthleteOrganisation(personId, organisationId) {
        // drop the PARTICIPATES_IN relationship in Neo4j
        const session = this.driver.session();
        try {
            await session.run(
                `
            MATCH (p:Person {id:$personId})-[r:PARTICIPATES_IN]->(o:Organisation {id:$organisationId})
            DELETE r
            `,
                { personId, organisationId }
            );
        } finally {
            await session.close();
        }
    }
}

module.exports = PersonService;