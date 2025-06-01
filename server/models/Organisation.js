class Organisation {
    constructor(driver) {
        this.driver = driver;
    }

    // Team with roles array handling
    async upsertTeam(data) {
        const { name, alternateName, sport, roles, location, description, foundingDate } = data;
        
        const session = this.driver.session();
        try {
            const checkResult = await session.run(
                'OPTIONAL MATCH (o:Organisation {name: $name}) RETURN o.roles as existingRoles',
                { name }
            );
            
            const existingRoles = checkResult.records[0]?.get('existingRoles') || [];
            
            let finalRoles = [...existingRoles];
            if (roles && Array.isArray(roles)) {
                roles.forEach(role => {
                    if (role && !finalRoles.includes(role)) {
                        finalRoles.push(role);
                    }
                });
            }

            // Create/update with merged roles
            const cypher = `
                MERGE (o:Organisation {name: $name})
                ON CREATE SET 
                    o.alternateName = $alternateName,
                    o.sport = $sport,
                    o.roles = $finalRoles,
                    o.location = $location,
                    o.description = $description,
                    o.foundingDate = $foundingDate,
                    o.createdAt = datetime(),
                    o.uuid = randomUUID(),
                    o.normalizedName = toLower(REPLACE($name, ' ', '-'))
                ON MATCH SET
                    o.alternateName = COALESCE($alternateName, o.alternateName),
                    o.sport = COALESCE($sport, o.sport),
                    o.roles = $finalRoles,
                    o.location = COALESCE($location, o.location),
                    o.description = COALESCE($description, o.description),
                    o.foundingDate = COALESCE($foundingDate, o.foundingDate),
                    o.updatedAt = datetime()
                WITH o
                CALL {
                    WITH o
                    WHERE o.sport IS NOT NULL
                    MERGE (s:Sport {name: o.sport})
                    ON CREATE SET s.label = "Sport"
                    MERGE (o)-[:PARTICIPATES_IN]->(s)
                }
                RETURN o
            `;

            const result = await session.run(cypher, {
                name,
                alternateName,
                sport,
                finalRoles,
                location,
                description,
                foundingDate
            });

            return result.records[0].get('o').properties;

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
                            t.description = 'Auto-created from athlete import'
            WITH a, t
            CALL {
              WITH t
              WHERE $sport <> "unknown"
              MERGE (s:Sport {name: $sport})
              ON CREATE SET s.label = $sportLabel
              MERGE (t)-[:PARTICIPATES_IN]->(s)
            }
            MERGE (a)-[:PARTICIPATES_IN]->(t)
            `,
                { athleteName, organisationName, sport, sportLabel }
            );
        } finally {
            await session.close();
        }
    }

    async linkTeamToLeague(organisationName, leagueName) {
        const session = this.driver.session();
        try {
          const normalizedOrganisationName = organisationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
          await session.run(
            `
            MATCH (t:Organisation {normalizedName: $normalizedOrganisationName})
            MERGE (l:Organisation {name: $leagueName})
            ON CREATE SET l.roles = ['league']
            MERGE (t)-[:PARTICIPATES_IN]->(l)
            `,
            {
              normalizedOrganisationName,
              leagueName
            }
          );
        } finally {
          await session.close();
        }
      }
      

}

module.exports = Organisation;