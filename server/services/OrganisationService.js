const neo4j = require('neo4j-driver');
const Organisation = require('../models/Organisation')

class OrganisationService {
  constructor(organisationModel, driver) {
    this.organisationModel = organisationModel;
    this.driver = driver;
  }

  async upsertTeam(data) {

    if (!data.name) {
      throw new Error('Organization name is required');
    }

    let processedRoles = null;
    if (data.roles) {
      if (Array.isArray(data.roles)) {

        processedRoles = data.roles.filter(role => role && role.trim().length > 0);
      } else if (typeof data.roles === 'string') {

        processedRoles = data.roles
          .split(/[,;|]/)
          .map(role => role.trim())
          .filter(role => role.length > 0);
      }
    }

    const organisationData = {
      name: data.name.trim(),
      alternateName: data.alternateName?.trim() || null,
      sport: data.sport?.trim() || null,
      roles: processedRoles,
      location: data.location?.trim() || null,
      description: data.description?.trim() || null,
      foundingDate: data.foundingDate?.trim() || null
    };

    return this.organisationModel.upsertTeam(organisationData);
  }

  async linkAthleteToOrg(athleteName, organisationName, sport, sportLabel) {
    return this.organisationModel.linkAthleteToOrg(athleteName, organisationName, sport, sportLabel);
  }

  async linkTeamToLeague(organisationName, leagueName) {
    return this.organisationModel.linkTeamToLeague(organisationName, leagueName);
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

  async getOrganisationByName(name) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (o:Organisation {name: $name}) RETURN o',
        { name }
      );
      return result.records[0]?.get('o').properties || null;
    } finally {
      await session.close();
    }
  }

  async searchOrganisations(filters = {}) {
    const { sport, location, roles } = filters;
    const session = this.driver.session();

    try {
      let cypher = 'MATCH (o:Organisation)';
      let params = {};
      const conditions = [];

      if (sport) {
        conditions.push('o.sport = $sport');
        params.sport = sport;
      }

      if (location) {
        conditions.push('toLower(o.location) CONTAINS toLower($location)');
        params.location = location;
      }

      if (roles) {
        conditions.push('$role IN o.roles');
        params.role = roles;
      }

      if (conditions.length > 0) {
        cypher += ' WHERE ' + conditions.join(' AND ');
      }

      cypher += ' RETURN o ORDER BY o.name';

      const result = await session.run(cypher, params);
      return result.records.map(r => r.get('o').properties);
    } finally {
      await session.close();
    }
  }
}
module.exports = OrganisationService;
