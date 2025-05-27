// Athlete specific endpoints: linking teams, athlete details
// Generic CRUD: users, login, signup, etc.
const bcrypt = require('bcrypt');
const { driver } = require('../neo4j');
const { sanitizeEmail, sanitizePassword } = require('../utils/inputSanitizers');

const PersonService = require('../services/PersonService');

const Athlete = require('../models/Athlete');
const Person = require('../models/Person');

const personModel = new Person(driver);
const athleteModel = new Athlete(driver);

const personServiceInstance = new PersonService(personModel, driver);

class PersonController {
    constructor(personService) {
        this.personService = personService;

        // Bind methods
        this.createOrUpdatePerson = this.createOrUpdatePerson.bind(this);
        this.login = this.login.bind(this);
        this.sessionInfo = this.sessionInfo.bind(this);
        this.logout = this.logout.bind(this);
        this.listUsers = this.listUsers.bind(this);
        this.listAthletes = this.listAthletes.bind(this);
        this.getSuggestedUsers = this.getSuggestedUsers.bind(this);
        this.linkAthleteToTeam = this.linkAthleteToTeam.bind(this);
        this.createOrUpdateAthlete = this.createOrUpdatePerson;
        this.removeAthleteOrganisation = this.removeAthleteOrganisation.bind(this);
        this.searchAthletes = this.searchAthletes.bind(this);
        this.searchUsers = this.searchUsers.bind(this);
        this.linkAthletes = this.linkAthletes.bind(this);
        this.getTopUsers = this.getTopUsers.bind(this);

    }

    // Generic User handlers

    async createOrUpdatePerson(req, res) {
        try {
            const person = await this.personService.createOrUpdatePerson(req.body);
            console.log('Retrieved person record:', person);
            res.status(201).json({ message: `Person '${person.name}' added or updated`, person });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async login(req, res, next) {
        console.log('>>> LOGIN route hit');
        console.log('>>> request body:', req.body);

        const identifier = sanitizeEmail(req.body.email);
        const password = sanitizePassword(req.body.password);

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        let session;

        try {
            session = driver.session();
            const result = await session.run(
                'MATCH (p:Person {email: $id}) WHERE exists(p.password) RETURN p.password AS hash',
                { id: identifier }
            );

            if (!result.records.length) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const hash = result.records[0].get('hash');
            if (!hash) {
                return res
                    .status(400)
                    .json({ error: 'Account has no password set. Try Google login.' });
            }

            const match = await bcrypt.compare(password, hash);
            if (!match) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            req.session.user = { identifier };
            console.log('***Session after login:', req.session);

            res
                .status(200)
                .json({ message: 'Login successful', user: { identifier } });
        } catch (err) {
            console.error('Login error:', err);
            next(err);
        } finally {
            session?.close();
        }
    }

    sessionInfo(req, res) {
        const user = req.session?.user || req.session?.passport?.user;

        if (user) {
            return res.status(200).json({ authenticated: true, user: { identifier: user } });
        } else {
            return res.status(401).json({ authenticated: false });
        }
    }


    async searchUsers(req, res, next) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: 'No query provided' });
        try {
            const results = await this.personService.searchUsers(query);
            res.json(results);
        } catch (err) {
            console.error('Search failed:', err);
            next(err);
        }
    }

    async listUsers(req, res) {
        try {
            const users = await this.personService.listUsers(req.query);
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getSuggestedUsers(req, res) {
        const { username } = req.params;
        try {
            const users = await this.personService.getSuggestedUsers(username);
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch suggested users' });
        }
    }

    // Athlete-specific handlers

    async listAthletes(req, res, next) {
        try {
            const { random, athleteCount } = req.query;
            const athletes = await this.personService.listAthletes({ random, athleteCount });
            res.json(athletes);
        } catch (err) {
            next(err);
        }
    }


    async linkAthleteToTeam(req, res) {
        const { id } = req.params;
        const { organisationId } = req.body;

        try {
            await this.personService.linkAthleteToTeam(id, organisationId);
            res.status(201).json({ message: 'Athlete linked to team successfully.' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async removeAthleteOrganisation(req, res, next) {
        const { id, organisationId } = req.params;
        try {
            // assumes your PersonService has a method by this name
            await this.personService.removeAthleteOrganisation(id, organisationId);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

    // server/controllers/PersonController.js
    async searchAthletes(req, res, next) {
        const { query, sport } = req.query;
        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'Query is required' });
        }

        try {
            const results = await this.personService.searchByName({ query, sport });
            const players = results.map(p => ({
                id: p.identity.toNumber(),
                name: p.properties.name,
                sport: p.properties.sport || null,
                profileImage: p.properties.profileImage || null,
                description: p.properties.description || null,
            }));

            if (players.length === 0) {
                const suggestionsRaw = await this.personService.suggestSimilarNames(query);
                const suggestions = suggestionsRaw.map(p => ({
                    id: p.identity.toNumber(),
                    name: p.properties.name,
                    sport: p.properties.sport || null
                }));
                return res.json({ players: [], suggestions });
            }

            res.json({ players });
        } catch (err) {
            next(err);
        }
    };

    logout(req, res, next) {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Logout failed' });
            }
            // clear the cookie named your session cookie (e.g. 'token' or 'connect.sid')
            res.clearCookie('token', {
                httpOnly: true,
                sameSite: 'Strict',
                secure: process.env.NODE_ENV === 'production',
            });
            res.json({ message: 'Logged out' });
        });
    }

    async linkAthletes(req, res, next) {
        // your implementation goes here
        res.json({ message: 'linkAthletes not implemented yet' });
    }

    async getTopUsers(req, res, next) {
        try {
            const users = await this.personService.getTopUsers();
            res.json(users);
        } catch (error) {
            console.error('[SERVER] Error fetching top users:', error);
            next(error);
        }
    }

}

module.exports = PersonController;
