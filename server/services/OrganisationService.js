class OrganisationService {
    constructor(organisationModel) {
      this.organisationModel = organisationModel;
    }
  
    async upsertTeam(data) {
      return this.organisationModel.upsertTeam(data);
    }
  
    async linkAthleteToTeam(athleteName, teamName) {
      return this.organisationModel.linkAthleteToTeam(athleteName, teamName);
    }
  }
  
  module.exports = OrganisationService;
  