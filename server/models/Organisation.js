class Organisation {
    constructor(driver) {
        this.driver = driver;
    }

    async upsertTeam(data) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
            MERGE (t:Organisation {normalizedName: toLower(REPLACE($name, ' ', '-'))})
            SET t.alternateName = $alternateName,
                t.sport = $sport,
                t.foundingDate = $foundingDate,
                t.location = $location,
                t.description = $description,
                t.roles = $roles,
                t.sameAs = $sameAs,
                t.image = $image,
                t.imageLicense = $imageLicense,
                t.imageCopyright = $imageCopyright
            WITH t
            MERGE (s:Sport {name: $sport})
            ON CREATE SET s.label = "Sport"
            MERGE (t)-[:PARTICIPATES_IN]->(s)
            RETURN t
            `,
                data
            );
            return result.records[0].get('t').properties;
        } finally {
            await session.close();
        }
    }

    async linkAthleteToTeam(athleteName, teamName, sport = "unknown", sportLabel = "Sport") {
        const session = this.driver.session();
        try {
          await session.run(
            `
            MERGE (a:Person {name: $athleteName})
            MERGE (t:Organisation {normalizedName: toLower(REPLACE($teamName, ' ', '-'))})
              ON CREATE SET t.name = $teamName,
                            t.roles = ['team'],
                            t.description = 'Auto-created from athlete import'
            MERGE (s:Sport {name: $sport})
              ON CREATE SET s.label = $sportLabel
            MERGE (a)-[:PARTICIPATES_IN]->(t)
            MERGE (t)-[:PARTICIPATES_IN]->(s)
            `,
            { athleteName, teamName, sport, sportLabel }
          );
        } finally {
          await session.close();
        }
      }      

    async linkTeamToLeague(teamName, leagueName) {
        const session = this.driver.session();
        try {
            await session.run(
                `
            MERGE (t:Organisation {name: $teamName})
            MERGE (l:Organisation {name: $leagueName})
            ON CREATE SET l.roles = ['league']
            MERGE (t)-[:PARTICIPATES_IN]->(l)
            `,
                { teamName, leagueName }
            );
        } finally {
            await session.close();
        }
    }

}

module.exports = Organisation;