const updates = require('../assets/update.json');
const categories = require('../assets/categories.json');

module.exports = ({ server, logger, config }) => {
    server.get('/', async (req, res) => {
        logger.info('Request made to "/"');
        return {
            message: config.helloworld
        };
    });

    server.get('/getUpdate', async(req) => {
        logger.info('Request made to "/getUpdate"');
        return updates;
    });

    server.get('/getCategories', async(req) => {
        logger.info('Request made to "/getCategories"');
        return categories
    });
};