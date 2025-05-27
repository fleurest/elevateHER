const neo4j = require('neo4j-driver');
const Organisation = require('../models/Organisation')

class OrganisationService {
  constructor(organisationModel, driver) {
    this.organisationModel = organisationModel;
    this.driver = driver;
  }

  async upsertTeam(data) {
    return this.organisationModel.upsertTeam(data);
  }

  async linkAthleteToTeam(athleteName, teamName, sport, sportLabel) {
    return this.organisationModel.linkAthleteToTeam(athleteName, teamName, sport, sportLabel);
  }

  async linkTeamToLeague(teamName, leagueName) {
    return this.organisationModel.linkTeamToLeague(teamName, leagueName);
  }

  async listOrganisations() {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (o:Organisation) RETURN o');
      return result.records.map(r => r.get('o').properties);
    } finally {
      await session.close();
    }
  }
}
module.exports = OrganisationService;
