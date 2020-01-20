//* Imports
const Server = require('./structures/Server');
const config = require('./config.json');
const setup = require('./setup');

//* Initialize the server
const api = new Server(config);
api.run();
    //.then(() => setup.recursive(api))
    //.then(() => api.logger.info('Recursed over all images and quotes, do not run this again!'));

//* Handle when the process exits
process.on('SIGINT', () => {
    api.logger.info('Received CTRL+C action!');
    api.db.client.close();
    api.server.close();
    process.exit();
});

//* Handle uncaught and promise exceptions
process.on('unhandledRejection', (reason) => 
    api.logger.error(`Unable to handle promise:\n${reason}`)
);

process.on('uncaughtException', (error) =>
    api.logger.warn(`Received an uncaught exception:\n${error.stack ? error.stack : error.message}`)
);