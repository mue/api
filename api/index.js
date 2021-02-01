const config = require('../config.json');

module.exports = async (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(config.helloworld);
};