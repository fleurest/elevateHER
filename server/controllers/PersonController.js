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

    async getTopUsers(req, res) {
        try {
          const users = await this.personService.getTopUsers(10);
          res.json(users);
        } catch (err) {
          console.error('[CONTROLLER] Error fetching top users:', err);
          res.status(500).json({ error: 'Failed to fetch top users' });
        }
      }

      async getSuggestedUsers(req, res) {
        const { username } = req.params;
      
        try {
          const users = await personService.getSuggestedUsers(username);
          res.status(200).json(users);
        } catch (error) {
          console.error('Error fetching suggested users:', error);
          res.status(500).json({ error: 'Failed to fetch suggested users' });
        }
      }
}

module.exports = PersonController;
