const { readdir } = require('fs');
const fastify = require('fastify');
const Logger = require('leekslazylogger-fastify');
const config = require('../config.json');

const log = new Logger({
	name: config.logs.name,
    logToFile: config.logs.logToFile,
    format: '{method} {status-colour}{status} &7{path} {time-colour}({time})'
});

const db = require('better-sqlite3')('mue.db');
db.pragma('journal_mode = WAL'); // This makes sqlite FAST
db.pragma('synchronous = OFF'); // disable sync, we only do read requests so hopefully corruption shouldn't occur

module.exports = class Server {
    constructor(config) {
        this.server = fastify({
            ignoreTrailingSlash: true
        });
        this.config = config;
        this.log = log;
        this.db = db;
    }

    addMiddleware() {
        this.server.register(log.fastify); // logger plugin
        if (!this.config.nginx) this.server.register(require('fastify-cors'));
        this.server.register(require('fastify-rate-limit'), {
            max: config.ratelimit.max,
            timeWindow: config.ratelimit.timewin,
            keyGenerator: (req) => { return req.headers['x-real-ip'] || req.raw.ip } // support for nginx
        });
    }

    addRoutes() {
        this.log.info('Now building routes');

        readdir('./routers', (error, files) => {
            if (error) this.log.error(`Unable to build routes:\n${error}`);
            files.forEach(file => {
                require(`../routers/${file}`)(this);
                this.log.info(`Built ${file} route`);
            });
        });
    }

    async run() {
        this.addMiddleware();
        this.addRoutes();

        await new Promise(resolve => setTimeout(resolve, 1000));
        this.server.listen(this.config.port, (error, address) =>
            error ? this.log.error(`Unable to build the Fastify instance:\n${error}`) : this.log.info(`Running the API server at ${address}`)
        );
    }
};