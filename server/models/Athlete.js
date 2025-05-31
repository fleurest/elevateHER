class Athlete {
    constructor(driver) {
        this.driver = driver;
    }


    async getRandomAthletes(count) {
        const session = this.driver.session();
        try {
            const safeCount = Number.isInteger(count) ? count : parseInt(count, 10);
            const result = await session.run(
                `
            MATCH (p:Person)
            WHERE 'athlete' IN p.roles
            WITH p, rand() AS r
            RETURN p
            LIMIT $count
            `,
                { count: safeCount }
            );
            return result.records.map(r => r.get('p').properties);
        } finally {
            await session.close();
        }
    }
      
}
module.exports = Athlete;
