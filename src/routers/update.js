const fetch = require('centra');
const cheerio = require('cheerio');

module.exports = ({ server, config }) => {
    server.get('/changelog', async () => {
        const data = await (await fetch(config.update.url + config.update.post).send()).text(); // Get the latest blog post from the API
        const $ = cheerio.load(data);

        return {
            title: $('h1', '.wrapper').html(),
            content: $('.post__entry').html(),
            image: 'null',
            url: config.update.url + config.update.post,
            published: $('.post__meta').text(),
            author: config.update.author
        }
    });
};