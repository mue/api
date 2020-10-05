//* Imports
const Server = require('./structures/Server');
const config = require('./config.json');

//* Initialize the server
const api = new Server(config);
api.run();