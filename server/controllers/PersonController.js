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

    async login(req, res) {
        try {
            const { username, password } = req.body;
            // authentication
            const { person, roles } = await this.personService.authenticatePerson(username, password);
            console.log('Retrieved person record:', person);
            if (!person) {
                console.log('Authentication failed: No person found or invalid password.');
                return res.status(401).json({ error: "Invalid credentials" });
            }

            res.json({ person, roles });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Login failed due to server error' });
        }
    }
}

module.exports = PersonController;
