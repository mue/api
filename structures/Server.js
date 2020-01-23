const { readdir } = require('fs');
const Database = require('./Database.js');
const fastify = require('fastify');
const log = require('leekslazylogger');

module.exports = class Server {
    constructor(config) {
        this.server = fastify();
        this.config = config;
        this.logger = log;
        this.db = new Database(this);
    }

    addMiddleware() {
        this.logger.init(this.config.logname);

        this.server.register(require('fastify-cors'));
        this.server.register(require('fastify-no-icon'));
        this.server.register(require('fastify-rate-limit'), {
            timeWindow: this.config.ratelimit.timeWindow,
            max: this.config.ratelimit.max
        });
    }

    addRoutes() {
        this.logger.info('Now building routes');
        const location = `${process.cwd()}${require('path').sep}routes`;
        
        readdir(location, (error, files) => {
            if (error) this.logger.error(`Unable to build routes:\n${error}`);
            files.forEach(file => {
                require(`${location}${require('path').sep}${file}`)(this);
                this.logger.info(`Built route in "${file}"`);
            });
        });
    }

    async run() {
        this.addMiddleware();
        this.addRoutes();
        this.db.connect();

        await new Promise(resolve => setTimeout(resolve, 5000));
        this.server.listen(this.config.port, (error, address) =>
            error ? this.logger.error(`Unable to build the fastify instance:\n${error}`) : this.logger.info(`Running the API server at ${address}`)
        );
    }
}