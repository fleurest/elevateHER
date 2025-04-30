class OrganisationService {
    constructor(organisationModel) {
      this.organisationModel = organisationModel;
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
      
  }
  
  module.exports = OrganisationService;
  