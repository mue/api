const fetch = require('centra');
const cheerio = require('cheerio');

module.exports = ({ server, config }) => {
    server.get('/getUpdate', async (_req, res) => {
        const data = await (await fetch(`https://blog.muetab.com/update-410/`).send()).text();
        const $ = cheerio.load(data);

        return {
            title: '',
            content: $('.post__entry').innerHTML,
            image: 'null',
            url: 'https://blog.muetab.com/update-410/',
            published: '',
            author: 'Mue Staff'
        }
    });
};