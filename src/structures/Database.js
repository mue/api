const { MongoClient } = require('mongodb');

module.exports = class Database {
    constructor(server) {
        this.server = server;
        this.client = new MongoClient(server.config.databaseUrl, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        });
    }

    get images() {
        return this.db.collection('images');
    }

    get quotes() {
        return this.db.collection('quotes');
    }

    async connect() {
        await this.client.connect();

        this.db = this.client.db('mue');
        this.server.logger.info('Connected to MongoDB');
    }
};