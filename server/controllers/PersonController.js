
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

        this.getAthleteNetwork = this.getAthleteNetwork.bind(this);
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
                roles: userProps.roles,
                profileImage: userProps.profileImage
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

            const { username, roles = [], profileImage, location, bio } = userProps;

            req.session.user = {
                username,
                email: userProps.email,
                profileImage: profileImage || '',
                location: location || '',
                bio: bio || '',
                roles
            };

            return res.json({
                message: 'Login successful',
                user: {
                    username,
                    email: userProps.email,
                    profileImage: profileImage || '',
                    location: location || '',
                    bio: bio || '',
                    roles
                }
            });
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
                    profileImage: user.profileImage || '',
                    location: user.location || '',
                    bio: user.bio || '',
                    roles: user.roles
                }
            });
        } else {
            return res.status(200).json({
                user: null
            });
        }
    }

    async searchUsers(req, res) {
        try {
            const { query } = req.query;

            if (!query || query.trim().length === 0) {
                return res.status(400).json({ error: 'Search query is required' });
            }

            console.log('🔍 Searching for users with query:', query);

            const session = driver.session();

            try {
                const cypher = `
              MATCH (p:Person)
              WHERE 'user' IN p.roles 
              AND (
                toLower(p.username) CONTAINS toLower($query) 
                OR toLower(p.email) CONTAINS toLower($query)
                OR toLower(p.name) CONTAINS toLower($query)
              )
              RETURN p
              ORDER BY p.username
              LIMIT 20
            `;

                const result = await session.run(cypher, { query: query.trim() });

                const users = result.records.map(record => {
                    const person = record.get('p');
                    return {
                        id: person.identity.toNumber(),
                        username: person.properties.username,
                        email: person.properties.email,
                        name: person.properties.name,
                        profileImage: person.properties.profileImage,
                        description: person.properties.description
                    };
                });

                console.log(`Found ${users.length} users matching "${query}"`);
                res.json(users);

            } finally {
                await session.close();
            }

        } catch (error) {
            console.error('Error in searchUsers:', error);
            res.status(500).json({
                error: 'Failed to search users',
                details: error.message
            });
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

    async listAthletes(req, res) {
        try {
            const { random, athleteCount = 5, withNetwork } = req.query;

            const session = driver.session();

            try {
                if (random === 'true') {
                    if (withNetwork === 'true') {
                        console.log('Discovery mode: Finding connected athlete...');

                        const query = `
                  MATCH (athlete:Person)
                  WHERE 'athlete' IN athlete.roles
                  MATCH (athlete)--()
                  WITH athlete, rand() as r
                  ORDER BY r
                  LIMIT 1
                  
                  OPTIONAL MATCH (athlete)-[r1]-(hop1)
                  OPTIONAL MATCH (hop1)-[r2]-(hop2)
                  WHERE hop2 <> athlete
                  
                  WITH athlete,
                       collect(DISTINCT hop1) as hop1Nodes,
                       collect(DISTINCT hop2)[0..15] as hop2Nodes,
                       collect(DISTINCT r1) as hop1Rels,
                       collect(DISTINCT r2) as hop2Rels
                  
                  RETURN athlete, hop1Nodes, hop2Nodes, hop1Rels, hop2Rels
                `;

                        const result = await session.run(query);

                        if (result.records.length === 0) {
                            return res.status(404).json({ error: 'No connected athletes found' });
                        }

                        const record = result.records[0];
                        const athlete = record.get('athlete');
                        const hop1Nodes = record.get('hop1Nodes');
                        const hop2Nodes = record.get('hop2Nodes');
                        const hop1Rels = record.get('hop1Rels');
                        const hop2Rels = record.get('hop2Rels');

                        const nodes = [];
                        const edges = [];
                        const processedNodeIds = new Set();
                        const processedEdgeIds = new Set();

                        // Add central athlete
                        const athleteId = athlete.identity.toString();
                        nodes.push({
                            data: {
                                id: athleteId,
                                label: athlete.properties.name || 'Unknown Athlete',
                                name: athlete.properties.name,
                                sport: athlete.properties.sport,
                                nationality: athlete.properties.nationality,
                                type: 'athlete',
                                roles: athlete.properties.roles,
                                profileImage: athlete.properties.profileImage,
                                isCenter: true
                            }
                        });
                        processedNodeIds.add(athleteId);

                        // Add connected nodes
                        [...hop1Nodes, ...hop2Nodes].forEach(node => {
                            if (node && !processedNodeIds.has(node.identity.toString())) {
                                nodes.push({
                                    data: {
                                        id: node.identity.toString(),
                                        label: node.properties.name || node.properties.label || 'Unknown',
                                        name: node.properties.name,
                                        sport: node.properties.sport,
                                        nationality: node.properties.nationality,
                                        type: node.labels[0]?.toLowerCase() || 'person',
                                        roles: node.properties.roles,
                                        profileImage: node.properties.profileImage
                                    }
                                });
                                processedNodeIds.add(node.identity.toString());
                            }
                        });

                        // Add relationships
                        [...hop1Rels, ...hop2Rels].forEach(rel => {
                            if (rel && !processedEdgeIds.has(rel.identity.toString()) &&
                                processedNodeIds.has(rel.start.toString()) &&
                                processedNodeIds.has(rel.end.toString())) {
                                edges.push({
                                    data: {
                                        id: rel.identity.toString(),
                                        source: rel.start.toString(),
                                        target: rel.end.toString(),
                                        label: rel.type,
                                        relationship: rel.type
                                    }
                                });
                                processedEdgeIds.add(rel.identity.toString());
                            }
                        });

                        return res.json({
                            nodes,
                            edges,
                            centralPlayer: {
                                id: athleteId,
                                name: athlete.properties.name,
                                sport: athlete.properties.sport
                            },
                            stats: {
                                totalNodes: nodes.length,
                                totalEdges: edges.length
                            },
                            discoveryMode: true
                        });

                    } else {
                        console.log('🎯 Getting random athletes...');

                        const count = Math.floor(Number(athleteCount)) || 5;
                        console.log('Athlete count (converted):', count, typeof count);

                        const query = `
                  MATCH (p:Person)
                  WHERE 'athlete' IN p.roles
                  WITH p, rand() AS r
                  ORDER BY r
                  LIMIT $count
                  RETURN p
                `;

                        const neo4j = require('neo4j-driver');
                        const result = await session.run(query, {
                            count: neo4j.int(count)
                        });

                        const athletes = result.records.map(record => record.get('p').properties);
                        console.log(`✅ Retrieved ${athletes.length} random athletes`);
                        return res.json(athletes);
                    }
                } else {
                    // List all athletes
                    const query = `
                MATCH (a:Person) 
                WHERE 'athlete' IN a.roles 
                RETURN a.uuid AS id, a.name AS name, a.profileImage AS image
                LIMIT 100
              `;

                    const result = await session.run(query);
                    const athletes = result.records.map(record => ({
                        id: record.get('id'),
                        name: record.get('name'),
                        image: record.get('image')
                    }));

                    return res.json(athletes);
                }

            } finally {
                await session.close();
            }

        } catch (error) {
            console.error('Error in listAthletes:', error);
            res.status(500).json({
                error: 'Failed to fetch athletes',
                details: error.message
            });
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

    async getAthleteNetwork(req, res, next) {
        const { id } = req.params;

        const session = driver.session();
        try {
            const result = await session.run(
                `
                MATCH (athlete:Person {uuid: $id})
                OPTIONAL MATCH (athlete)-[r1]-(hop1)
                OPTIONAL MATCH (hop1)-[r2]-(hop2)
                WHERE hop2 <> athlete
                WITH athlete,
                     collect(DISTINCT hop1) as hop1Nodes,
                     collect(DISTINCT hop2)[0..15] as hop2Nodes,
                     collect(DISTINCT r1) as hop1Rels,
                     collect(DISTINCT r2) as hop2Rels
                RETURN athlete, hop1Nodes, hop2Nodes, hop1Rels, hop2Rels
                `,
                { id }
            );

            if (result.records.length === 0) {
                return res.status(404).json({ error: 'Athlete not found' });
            }

            const record = result.records[0];
            const athlete = record.get('athlete');
            const hop1Nodes = record.get('hop1Nodes');
            const hop2Nodes = record.get('hop2Nodes');
            const hop1Rels = record.get('hop1Rels');
            const hop2Rels = record.get('hop2Rels');

            const nodes = [];
            const edges = [];
            const processedNodeIds = new Set();
            const processedEdgeIds = new Set();

            const athleteId = athlete.identity.toString();
            nodes.push({
                data: {
                    id: athleteId,
                    label: athlete.properties.name || 'Unknown Athlete',
                    name: athlete.properties.name,
                    sport: athlete.properties.sport,
                    nationality: athlete.properties.nationality,
                    type: 'athlete',
                    roles: athlete.properties.roles,
                    profileImage: athlete.properties.profileImage,
                    isCenter: true
                }
            });
            processedNodeIds.add(athleteId);

            [...hop1Nodes, ...hop2Nodes].forEach(node => {
                if (node && !processedNodeIds.has(node.identity.toString())) {
                    nodes.push({
                        data: {
                            id: node.identity.toString(),
                            label: node.properties.name || node.properties.label || 'Unknown',
                            name: node.properties.name,
                            sport: node.properties.sport,
                            nationality: node.properties.nationality,
                            type: node.labels[0]?.toLowerCase() || 'person',
                            roles: node.properties.roles,
                            profileImage: node.properties.profileImage
                        }
                    });
                    processedNodeIds.add(node.identity.toString());
                }
            });

            [...hop1Rels, ...hop2Rels].forEach(rel => {
                if (rel && !processedEdgeIds.has(rel.identity.toString()) &&
                    processedNodeIds.has(rel.start.toString()) &&
                    processedNodeIds.has(rel.end.toString())) {
                    edges.push({
                        data: {
                            id: rel.identity.toString(),
                            source: rel.start.toString(),
                            target: rel.end.toString(),
                            label: rel.type,
                            relationship: rel.type
                        }
                    });
                    processedEdgeIds.add(rel.identity.toString());
                }
            });

            res.json({ nodes, edges });
        } catch (err) {
            next(err);
        } finally {
            await session.close();
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
            const limit = parseInt(req.query.limit, 10) || undefined;
            const users = await this.personService.getTopUsers(limit); res.json(users);
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

            console.log('[SERVER] >>> About to create user with data:', {
                username: user,
                email: mail,
                hasPasswordHash: !!hash,
                roles: ['user']
            });

            const person = await this.personService.createOrUpdateUser({
                username: user,
                email: mail,
                passwordHash: hash,
                location: location || '',
                bio: bio || '',
                profileImage: profileImage || '',
                roles: ['user']
            });

            console.log('[SERVER] >>> User creation result:', person);

            res.status(201).json({ message: 'Registration successful', person });
        } catch (err) {
            console.error('Registration error:', err);
            next(err);
        }
    }

    async updateProfile(req, res, next) {
        try {
            if (!req.session?.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { username, email, location, bio, profileImage } = req.body;
            const userEmail = email || req.session.user.email;

            const currentUser = await this.personService.findByEmail(userEmail); const currentUsername = req.session.user.username;

            if (!currentUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            let finalUsername = currentUser.username || req.session.user.username;

            if ((!currentUser.username || currentUser.username.trim() === '') && username) {
                const exists = await this.personService.usernameExists(username);
                if (exists) {
                    return res.status(400).json({ error: 'Username already taken' });
                }
                finalUsername = username;
            }

            const updatedUser = await this.personService.createOrUpdateUser({
                username: finalUsername,
                email: userEmail,
                passwordHash: currentUser.password || currentUser.passwordHash,
                roles: currentUser.roles || ['user'],
                location: location,
                bio: bio,
                profileImage: profileImage
            });

            req.session.user.username = finalUsername;
            res.json(updatedUser);

        } catch (err) {
            console.error('Error updating profile:', err);
            res.status(500).json({ error: 'Failed to update user profile' });
        }
    }
}

module.exports = PersonController
