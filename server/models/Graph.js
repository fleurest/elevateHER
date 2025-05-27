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

    async _safeLimit(limit, defaultVal) {
        const n = Number.isInteger(limit) ? limit : parseInt(limit, 10);
        return Number.isNaN(n) ? defaultVal : n;
    }

    async getAllConnections(limit = 100) {
        const session = this.driver.session();
        const safeLimit = await this._safeLimit(limit, 100);

        try {
            const result = await session.run(
                `
            MATCH (n)-[r]->(m)
            RETURN n, r, m
            LIMIT toInteger($limit)
            `,
                { limit: safeLimit }
            );
            return result.records;
        } finally {
            await session.close();
        }
    }

    async getAcceptedFriends(username) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                MATCH (u1:Person {username: $username})-[r:FRIENDS_WITH {status: "accepted"}]-(u2:Person)
                RETURN u1, r, u2
                `,
                { username }
            );
            return result.records;
        } finally {
            await session.close();
        }
    }

    /**
       * Fetch athlete ↔ team relationships by matching on the athlete's name or any alternateName.
       * @param {string} name  The human‐readable name to look up.
       * @returns {Promise<Array>}  List of { athleteId, organisationId, relProps, orgProps }.
       */

    async getAthleteOrgGraph(name) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
          MATCH (p:Person)
          WHERE
            toLower(p.name) = toLower($name)
            OR ANY(alias IN coalesce(p.alternateName, []) WHERE toLower(alias) = toLower($name))
          MATCH (p)-[r:PARTICIPATES_IN]->(o:Organisation)
          WHERE o.role <> 'sponsor'
          RETURN
            p.uuid            AS athleteId,
            r                 AS relationship,
            o.uuid            AS organisationId,
            o                 AS organisationNode
          `,
                { name }
            );

            return result.records.map(rec => ({
                athleteId: rec.get('athleteId'),
                relationship: rec.get('relationship').properties,
                organisationId: rec.get('organisationId'),
                organisation: rec.get('organisationNode').properties
            }));
        } finally {
            await session.close();
        }
    }
}

module.exports = Graph;