const { driver } = require('../neo4j');
const Organisation = require('../models/Organisation');
const OrganisationService = require('../services/OrganisationService');

const organisationModel = new Organisation(driver);
const organisationService = new OrganisationService(organisationModel, driver);

class OrganisationController {
  constructor(service) {
    this.service = service;
    this.list = this.list.bind(this);
    this.upsert = this.upsert.bind(this);
    this.link = this.link.bind(this);
    this.search = this.search.bind(this);
    this.linkTeamToLeague = this.linkTeamToLeague.bind(this);
  }

  async list(req, res, next) {
    try {
      const orgs = await this.service.listOrganisations();
      res.json(orgs);
    } catch (err) {
      console.error('[OrganisationController.list] Error:', err);
      next(err);
    }
  }

  async upsert(req, res, next) {
    try {
      const team = await this.service.upsertTeam(req.body);
      res.status(201).json({ message: `Team '${team.name}' upserted`, team });
    } catch (err) {
      console.error('[OrganisationController.upsert] Error:', err);
      next(err);
    }
  }

  async link(req, res, next) {
    const { athleteName, organisationName, sport = 'unknown', sportLabel = 'Sport' } = req.body;
    try {
      await this.service.linkAthleteToOrg(athleteName, organisationName, sport, sportLabel);
      res.json({ message: `${athleteName} linked to ${organisationName}` });
    } catch (err) {
      console.error('[OrganisationController.link] Error:', err);
      next(err);
    }
  }

  async linkTeamToLeague(req, res, next) {
    const { organisationName, leagueName } = req.body;
    if (!organisationName || !leagueName) {
      return res.status(400).json({ error: 'organisationName and leagueName are required' });
    }
    try {
      await this.service.linkTeamToLeague(organisationName, leagueName);
      res.json({ message: `${organisationName} linked to league ${leagueName}` });
    } catch (err) {
      console.error('[OrganisationController.linkTeamToLeague] Error:', err);
      next(err);
    }
  }

  async search(req, res, next) {
    try {
      const { sport, location, roles } = req.query;
      const filters = {};
      if (sport) filters.sport = sport;
      if (location) filters.location = location;
      if (roles) filters.roles = roles;

      const orgs = await this.service.searchOrganisations(filters);
      res.json(orgs);
    } catch (err) {
      console.error('[OrganisationController.search] Error:', err);
      next(err);
    }
  }
}

module.exports = OrganisationController;
