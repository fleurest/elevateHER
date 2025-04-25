class Organisation {
    constructor(driver) {
      this.driver = driver;
    }
  
    async upsertTeam(data) {
      const session = this.driver.session();
      try {
        const result = await session.run(
          `
          MERGE (t:Organisation {name: $name})
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
          RETURN t
          `,
          data
        );
        return result.records[0].get('t').properties;
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
          MATCH (t:Organisation {name: $teamName})
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