//* Imports
const Server = require('./structures/Server.js');
const config = require('./config.json');

//* Initialize the server
const api = new Server(config);
api.run();

//* Handle when the process exits
process.on('SIGINT', () => {
    api.logger.info('Received CTRL+C action!');
    api.db.client.close();
    api.server.close();
    process.exit();
});

//* Handle uncaught and promise exceptions
process.on('unhandledRejection', (reason) => api.logger.error(`Unable to handle promise:\n${reason}`));

process.on('uncaughtException', (error) => api.logger.warn(`Received an uncaught exception:\n${error.stack ? error.stack : error.message}`));