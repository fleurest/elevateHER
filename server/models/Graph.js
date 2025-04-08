class Graph {
    constructor(driver) {
        this.driver = driver;
    }

    async getParticipationGraph(limit = 25) {
        const session = this.driver.session();

        try {
            const safeLimit = Number.isInteger(limit) ? limit : parseInt(limit, 10);
            console.log('Parsed safeLimit:', safeLimit, '| type:', typeof safeLimit);

            const result = await session.run(
                'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT $limit',
                { limit: safeLimit }
            );
            return result.records;
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
        console.log('getAllConnections received limit:', limit, '| type:', typeof limit);
        const safeLimit = Number.isInteger(limit) ? limit : parseInt(limit, 10);
        console.log('Parsed safeLimit:', safeLimit, '| type:', typeof safeLimit);


        try {
            const safeLimit = parseInt(limit, 10);
            const cypher = `MATCH (n)-[r]->(m) RETURN n, r, m LIMIT ${safeLimit}`;
            const result = await session.run(cypher);

            return result.records;
        } finally {
            await session.close();
        }
    }

}


module.exports = Graph;
