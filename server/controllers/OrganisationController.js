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
            await this.personService.linkAthleteToTeam(name, teamName, sport, "Sport");
            res.status(200).json({ message: `${athleteName} linked to team ${teamName}` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async linkTeamToLeague(req, res) {
        const { teamName, leagueName } = req.body;

        if (!teamName || !leagueName) {
            return res.status(400).json({ error: 'teamName and leagueName are required' });
        }

        try {
            await this.organisationService.linkTeamToLeague(teamName, leagueName);
            res.status(200).json({ message: `${teamName} linked to league ${leagueName}` });
        } catch (err) {
            console.error('[linkTeamToLeague] Error:', err);
            res.status(500).json({ error: `Failed to link ${teamName} to league ${leagueName}` });
        }
    }

}

module.exports = OrganisationController;