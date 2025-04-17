const bcrypt = require('bcrypt');

class PersonService {
    constructor(personModel) {
        this.personModel = personModel;
    }

    validatePersonData(data) {
        if (!data.name || !data.sport) {
            throw new Error('Name and sport are required');
        }
    }

    async createOrUpdatePerson(data) {
        this.validatePersonData(data);

        const cleanedData = {
            name: data.name.trim(),
            sport: data.sport.trim(),
        };

        return await this.personModel.createOrUpdate(cleanedData);
    }

    async authenticatePerson(username, password) {
        const personRecord = await this.personModel.findByUser(username);
        console.log('Retrieved personRecord:', personRecord);
    
        if (!personRecord) {
            console.log('No person found with that username.');
            return { person: null, roles: [] };
        }
    
        const isValid = await bcrypt.compare(password, personRecord.password);
        console.log('Password valid:', isValid);
    
        if (!isValid) {
            console.log('Password mismatch.');
            return { person: null, roles: [] };
        }
    
        // Structure the person object (you can customize what you expose)
        const { password: _, ...sanitizedPerson } = personRecord;
    
        return {
            person: sanitizedPerson,
            roles: personRecord.roles || []
        };
    }    
    async getTopUsers(limit = 10) {
        const session = this.driver.session();
        try {
          const result = await session.run(
            `
            MATCH (p:Person)
            WHERE 'user' IN p.roles
            RETURN p
            LIMIT $limit
            `,
            { limit: neo4j.int(limit) }
          );
      
          return result.records.map(record => {
            const node = record.get('p');
            return {
              id: node.identity.toString(),
              ...node.properties
            };
          });
        } finally {
          await session.close();
        }
      }
      
}

module.exports = PersonService;