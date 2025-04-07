class Person {
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

    constructor(driver) {
        this.driver = driver;
    }

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
                MATCH (p:Player)
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
                MATCH (p:Player)
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
                MATCH (u:User {username: $username})-[:LIKED]->(p:Player)
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
                MERGE (p:Player {name: $playerName})
                MERGE (u)-[:LIKED]->(p)
                `,
                { username, playerName }
            );
        } finally {
            await session.close();
        }
    }
    
}

module.exports = Person;
