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
            sport: data.sport.trim()
        };
        return await this.personModel.createOrUpdate(cleanedData);
    }
}

module.exports = PersonService;
