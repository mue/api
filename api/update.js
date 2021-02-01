const fetch = require('centra');
const cheerio = require('cheerio');
const config = require('../config.json');

module.exports = async (_req, res) => {
    const data = await (await fetch(config.update.url + config.update.post).send()).text();
    const $ = cheerio.load(data);

    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send({
        title: $('h1', '.wrapper').html(),
        content: $('.post__entry').html(),
        image: 'null',
        url: config.update.url + config.update.post,
        published: $('.post__meta').text(),
        author: config.update.author
    });
};