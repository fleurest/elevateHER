const neo4j = require('neo4j-driver');

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
                { limit: neo4j.int(safeLimit) }
            );
            return result.records;
        } finally {
            await session.close();
        }
    }

    async _safeLimit(limit, defaultVal) {
        const n = Number.isInteger(limit) ? limit : parseInt(limit, 10);
        const result = Number.isNaN(n) ? defaultVal : n;
        return Math.floor(result);
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
                { limit: neo4j.int(safeLimit) }
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

    /**
     * Get liked entities (people, teams, etc.) for a user by email
     * @param {string} email - User's email
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of liked entities with relationship details
     */
    async getLikedByEmail(email, limit = 50) {
        const session = this.driver.session();
        const safeLimit = await this._safeLimit(limit, 50);

        try {
            const result = await session.run(
                `
                MATCH (user:Person {email: $email})-[r:LIKES]->(target)
                RETURN 
                    user,
                    r,
                    target,
                    labels(target) AS targetLabels
                ORDER BY r.createdAt DESC
                LIMIT $limit
                `,
                {
                    email: email,
                    limit: neo4j.int(safeLimit)
                }
            );

            return result.records;
        } finally {
            await session.close();
        }
    }

    /**
     * Get liked people specifically for a user by email
     * @param {string} email - User's email
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of liked people
     */
    async getLikedPeopleByEmail(email, limit = 50) {
        const session = this.driver.session();
        const safeLimit = await this._safeLimit(limit, 50);

        try {
            const result = await session.run(
                `
                MATCH (user:Person {email: $email})-[r:LIKES]->(person:Person)
                RETURN 
                    user,
                    r,
                    person
                ORDER BY r.createdAt DESC
                LIMIT $limit
                `,
                {
                    email: email,
                    limit: neo4j.int(safeLimit)
                }
            );

            return result.records;
        } finally {
            await session.close();
        }
    }

    /**
     * Get liked organisations/teams for a user by email
     * @param {string} email - User's email
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of liked organisations
     */
    async getLikedOrganisationsByEmail(email, limit = 50) {
        const session = this.driver.session();
        const safeLimit = await this._safeLimit(limit, 50);

        try {
            const result = await session.run(
                `
                MATCH (user:Person {email: $email})-[r:LIKES]->(org:Organisation)
                RETURN 
                    user,
                    r,
                    org
                ORDER BY r.createdAt DESC
                LIMIT $limit
                `,
                {
                    email: email,
                    limit: neo4j.int(safeLimit)
                }
            );

            return result.records;
        } finally {
            await session.close();
        }
    }

    /**
 * Get all liked entities across all users
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of liked relationships
 */
    async getAllLikes(limit = 50) {

        const session = this.driver.session();
        const safeLimit = await this._safeLimit(limit, 50);

        try {
            const result = await session.run(
                `
                    MATCH (user:Person)-[r:LIKES]->(target)
                    RETURN user, r, target, labels(target) AS targetLabels
                    ORDER BY r.createdAt DESC
                    LIMIT $limit
                    `,
                {
                    limit: neo4j.int(safeLimit)
                }
            );

            return result.records;
        } finally {
            await session.close();
        }
    }

    /**
    * Get friends for a user by email
    * @param {string} email - User's email
    * @param {number} limit - Maximum number of results
    * @returns {Promise<Array>} Array of friend relationships
    */
    async getFriendsByEmail(email, limit = 50) {
        const session = this.driver.session();
        const safeLimit = await this._safeLimit(limit, 50);

        try {
            const result = await session.run(
                `
                MATCH (user:Person {email: $email})-[r:FRIENDS_WITH]-(friend:Person)
                WHERE 'user' IN friend.roles
                OPTIONAL MATCH (friend)-[l:LIKES]->(liked)
                RETURN
                    user,
                    r,
                    friend,
                    l,
                    liked
                ORDER BY r.createdAt DESC
                LIMIT $limit
                `,
                {
                    email: email,
                    limit: neo4j.int(safeLimit)
                }
            );

            return result.records;
        } finally {
            await session.close();
        }
    }

    /**
 * Get the organisation with the most PARTICIPATES_IN players and their liked nodes
 * @returns {Promise<Array>} Query results containing organisation, players and likes
 */
    async getTopOrgWithLikes() {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
                    MATCH (o:Organisation)<-[:PARTICIPATES_IN]-(p:Person)
                    WITH o, count(p) AS playerCount
                    ORDER BY playerCount DESC
                    LIMIT 1
                    MATCH (o)<-[part:PARTICIPATES_IN]-(p:Person)
                    OPTIONAL MATCH (p)-[like:LIKES]->(liked)
                    RETURN o, p, part, like, liked
                    `
            );
            return result.records;
        } finally {
            await session.close();
        }
    }
}

module.exports = Graph;