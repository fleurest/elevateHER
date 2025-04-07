class PersonController {
    constructor(personService) {
        this.personService = personService;
    }

    async createOrUpdate(req, res) {
        try {
            const person = await this.personService.createOrUpdatePerson(req.body);
            res.status(201).json({ message: `Person '${person.name}' added or updated`, person });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = PersonController;