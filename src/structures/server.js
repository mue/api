const { readdir } = require('fs');
const fastify = require('fastify');
const Logger = require('leekslazylogger-fastify');
const config = require('../config.json');

const log = new Logger({
	name: config.logs.name,
	logToFile: config.logs.logToFile,
});

const db = require('better-sqlite3')(config.database);
db.pragma('journal_mode = WAL'); // This makes sqlite FAST

const GhostContentAPI = require('@tryghost/content-api'); // for getUpdate endpoint
const ghost = new GhostContentAPI({
	url: config.update.blogurl,
	key: config.update.ghostapikey,
	version: config.update.ghostversion
});

module.exports = class Server {
    constructor(config) {
        this.server = fastify();
        this.config = config;
        this.log = log;
        this.db = db;
        this.ghost = ghost;
    }

    addMiddleware() {
        this.server.register(log.fastify); // logger plugin
        this.server.register(require('fastify-cors'));
        this.server.register(require('fastify-rate-limit'), {
            max: config.ratelimit.max,
            timeWindow: config.ratelimit.timewin
        });
    }

    addRoutes() {
        this.log.info('Now building routes');

        readdir('./routers', (error, files) => {
            if (error) this.log.error(`Unable to build routes:\n${error}`);
            files.forEach(file => {
                require(`../routers/${file}`)(this);
                this.log.info(`Built route in "${file}"`);
            });
        });
    }

    async run() {
        this.addMiddleware();
        this.addRoutes();

        await new Promise(resolve => setTimeout(resolve, 1000));
        this.server.listen(this.config.port, (error, address) =>
            error ? this.log.error(`Unable to build the fastify instance:\n${error}`) : this.log.info(`Running the API server at ${address}`)
        );
    }
};