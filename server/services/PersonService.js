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

        const cleanedData = {
            name: data.name.trim(),
            sport: data.sport.trim(),
        };

        return await this.personModel.createOrUpdate(cleanedData);
    }

    async authenticatePerson(username, password) {
        const personRecord = await this.personModel.findByUser(username);
        console.log('Retrieved personRecord:', personRecord);

        if (!personRecord) {
            console.log('No person found with that username.');
            return { person: null, roles: [] };
        }

        const isValid = await bcrypt.compare(password, personRecord.password);
        console.log('Password valid:', isValid);

        if (!isValid) {
            console.log('Password mismatch.');
            return { person: null, roles: [] };
        }

        // Structure the person object (you can customize what you expose)
        const { password: _, ...sanitizedPerson } = personRecord;

        return {
            person: sanitizedPerson,
            roles: personRecord.roles || []
        };
    }
    async getTopUsers(limit = 5) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (p:Person)
                WHERE p.roles IS NOT NULL AND 'user' IN p.roles
                RETURN p
                ORDER BY p.name
                LIMIT $limit
            `,
                { limit: neo4j.int(limit) }
            );
            return result.records.map(record => record.get('p').properties);
        } catch (error) {
            console.error('[SERVICE] Error fetching top users:', error);
            return [];
        } finally {
            await session.close();
        }
    }

    async getFriendsForUser(username, limit = 4) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
            MATCH (:Person {username: $username})-[:FRIENDS_WITH]-(friend:Person)
            WHERE 'user' IN friend.roles
            RETURN friend
            ORDER BY rand()
            LIMIT $limit
            `,
                { username, limit: neo4j.int(limit) }
            );

            return result.records.map(record => {
                const node = record.get('friend');
                return {
                    username: node.properties.username,
                    profileImage: node.properties.profileImage || null,
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
    async linkAthleteToTeam(athleteName, teamName) {
        const session = this.driver.session();
        try {
            await session.run(
                `
            MATCH (a:Person {name: $athleteName})
            MATCH (t:Organization {name: $teamName})
            MERGE (a)-[:PARTICIPATES_IN]->(t)
            MERGE (s:Sport {name: "Volleyball", label: "Sport"})
            MERGE (t)-[:PARTICIPATES_IN]->(s)
            `,
                { athleteName, teamName }
            );
        } finally {
            await session.close();
        }
    }

    async linkAthleteToTeam(athleteName, teamName, sport = "Volleyball", sportLabel = "Sport") {
        const session = this.driver.session();
        try {
          await session.run(
            `
            MATCH (a:Person {name: $athleteName})
            MATCH (t:Organisation {name: $teamName})
            MERGE (a)-[:PARTICIPATES_IN]->(t)
            MERGE (s:Sport {name: $sport, label: $sportLabel})
            MERGE (t)-[:PARTICIPATES_IN]->(s)
            `,
            { athleteName, teamName, sport, sportLabel }
          );
        } finally {
          await session.close();
        }
      }

}

module.exports = PersonService;