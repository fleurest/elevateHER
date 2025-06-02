
const bcrypt = require('bcrypt');
const { driver } = require('../neo4j');
const { sanitizeEmail, sanitizeUsername, sanitizePassword } = require('../utils/inputSanitizers');

const PersonService = require('../services/PersonService');

const Athlete = require('../models/Athlete');
const Person = require('../models/Person');

const personModel = new Person(driver);
const athleteModel = new Athlete(driver);

const personService = new PersonService(personModel, driver);

class PersonController {
    constructor(personService) {
        this.personService = personService;

        // User account handlers
        this.createOrUpdateUser = this.createOrUpdateUser.bind(this);
        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
        this.sessionInfo = this.sessionInfo.bind(this);
        this.updateProfile = this.updateProfile.bind(this);

        // Athlete handlers
        this.createOrUpdatePerson = this.createOrUpdatePerson.bind(this);
        this.listAthletes = this.listAthletes.bind(this);
        this.searchAthletes = this.searchAthletes.bind(this);
        this.linkAthleteToOrg = this.linkAthleteToOrg.bind(this);
        this.removeAthleteOrganisation = this.removeAthleteOrganisation.bind(this);


        this.listUsers = this.listUsers.bind(this);
        this.getSuggestedUsers = this.getSuggestedUsers.bind(this);
        this.searchUsers = this.searchUsers.bind(this);
        this.getTopUsers = this.getTopUsers.bind(this);
    }


    async createOrUpdateUser(req, res, next) {
        try {
            const user = await this.personService.createOrUpdateUser(req.body);
            console.log('Retrieved person record:', user);
            res.status(201).json({ message: `Person '${user.name}' added or updated`, user });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async createOrUpdatePerson(req, res, next) {
        try {
            const person = await this.personService.createOrUpdatePerson(req.body);

            res.status(201).json(person);
        } catch (err) {
            next(err);
        }
    }

    async login(req, res, next) {
        try {
            console.log('>>> LOGIN route hit');
            console.log('>>> request body:', req.body);

            const email = sanitizeEmail(req.body.email);
            const password = req.body.password;

            console.log('>>> Sanitized email:', email);
            console.log('>>> Password length:', password ? password.length : 0);

            if (!email || !password) {
                return res.status(400).json({ error: 'Missing credentials' });
            }

            const userProps = await this.personService.findByEmail(email);
            console.log('>>> User found:', !!userProps);
            console.log('>>> User properties:', userProps ? {
                username: userProps.username,
                email: userProps.email,
                hasPasswordHash: !!userProps.passwordHash,
                hasPassword: !!userProps.password,
                roles: userProps.roles
            } : 'null');

            if (!userProps || !userProps.passwordHash) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const isAuth = await this.personService.authenticateUser(
                email,
                password
            );
            if (!isAuth) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const { username, roles = [] } = userProps;

            req.session.user = { username, roles };

            return res.json({ message: 'Login successful', user: { username, roles } });
        } catch (err) {
            console.error('Error in PersonController.login:', err);
            return next(err);
        }
    }


    sessionInfo(req, res) {
        console.log('*** sessionInfo called ***');
        console.log('SessionID:', req.sessionID);
        console.log('req.user:', req.user);
        console.log('req.session:', req.session);
        console.log('req.session.user:', req.session?.user);

        if (req.user || req.session?.user) {
            const user = req.user || req.session.user;
            return res.status(200).json({
                user: {
                    identifier: user.email || user.username,
                    username: user.username,
                    email: user.email,
                    roles: user.roles
                }
            });
        } else {
            return res.status(200).json({
                user: null
            });
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


    async linkAthleteToOrg(req, res, next) {
        try {
            const { athleteName, organisationName, sport, sportLabel } = req.body;
            await this.personService.linkAthleteToOrg(athleteName, organisationName, sport, sportLabel);
            res.json({ message: `${athleteName} linked to ${organisationName}` });
        } catch (err) {
            next(err);
        }
    }

    async removeAthleteOrganisation(req, res, next) {
        try {
            const { id, organisationId } = req.params;
            await this.personService.removeAthleteOrganisation(id, organisationId);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

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
            res.clearCookie('token', {
                httpOnly: true,
                sameSite: 'Strict',
                secure: process.env.NODE_ENV === 'production',
            });
            res.json({ message: 'Logged out' });
        });
    }

    async linkAthletes(req, res, next) {
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

    async register(req, res, next) {
        try {
            const { username, email, password, location = '', bio = '', profileImage = '' } = req.body;

            const user = sanitizeUsername(username);
            const mail = sanitizeEmail(email);
            const pass = sanitizePassword(password);

            const exists = await this.personService.findByEmail(mail);
            if (exists) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const hash = await bcrypt.hash(pass, 10);

            const person = await this.personService.createOrUpdateUser({
                username: user,
                email: mail,
                passwordHash: hash, 
                location: location || '',
                bio: bio || '',
                profileImage: profileImage || '',
                roles: ['user']
            });

            res.status(201).json({ message: 'Registration successful', person });
        } catch (err) {
            console.error('Registration error:', err);
            next(err);
        }
    }

    async updateProfile(req, res, next) {
        try {
            if (!req.session?.user?.username) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { email, location, bio, profileImage } = req.body;
            const currentUsername = req.session.user.username;

            const currentUser = await this.personService.findByEmail(email);
            if (!currentUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            const updatedUser = await this.personService.createOrUpdateUser({
                username: currentUsername,
                email: email,
                passwordHash: currentUser.password || currentUser.passwordHash,
                roles: currentUser.roles || ['user'],
                location: location,
                bio: bio,
                profileImage: profileImage
            });

            res.json(updatedUser);

        } catch (err) {
            console.error('Error updating profile:', err);
            res.status(500).json({ error: 'Failed to update user profile' });
        }
    }
}

module.exports = PersonController
