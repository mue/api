const package = require('../../package.json');

module.exports = ({ server, config }) => {
    server.get('/', async () => {
        return {
            version: package.version,
            message: `Hello World! API docs: ${config.docs}`
        };
    });
};