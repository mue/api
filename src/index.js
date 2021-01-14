const Server = require('./structures/server.js');
const config = require('./config.json');

new Server(config).run();