const dtf = require('@eartharoid/dtf');

module.exports = ({ server, config, ghost }) => {
    server.get('/getUpdate', async (_req, res) => {
        let data;
        try {
            data = await ghost.posts.read({ slug: config.update.post, include: ['authors'] });
        } catch (e) {
            res.status(502);
            return {
                statusCode: 502,
                error: 'Request Failed',
                message: 'Could not connect to the Mue Blog'
            };
        }

        return {
            title: data.title,
            content: data.html.replace(/<p><\/p>/gm, ''), // remove the spam at the end
            image: data.feature_image,
            url: data.url,
            published: dtf('n_D MMM YYYY', data.published_at, 'en-GB'),
            author: data.primary_author.name
        };
    });
};