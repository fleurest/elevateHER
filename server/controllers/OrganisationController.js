class OrganisationController {
    constructor(organisationService, personService) {
        this.organisationService = organisationService;
        this.personService = personService;
    }

    async upsert(req, res) {
        try {
            const team = await this.organisationService.upsertTeam(req.body);
            res.status(201).json({ message: `Team '${team.name}' upserted`, team });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async link(req, res) {
        const { athleteName, teamName } = req.body;
        try {
            await this.personService.linkAthleteToTeam(athleteName, teamName);
            res.status(200).json({ message: `${athleteName} linked to team ${teamName}` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = OrganisationController;