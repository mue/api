const fetch = require('centra');

module.exports = ({ server, db, config }) => {
    server.get('/image/random', async (req, res) => {
        const { category, format } = req.query;

        let data;
        if (category) {
            data = db.prepare('SELECT * FROM images WHERE category=? ORDER BY RANDOM() LIMIT 1;').get(category);
        } else {
            data = db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();
        }

        if (data === undefined) { // If the category isn't found
            res.status(400);
            return {
                error: 'Invalid Category',
                message: 'Category not found, look at /image/categories for a list'
            };
        }

        data.file = config.database.cdn + data.file + ((format === 'webp') ? '.webp' : '.jpg'); // Support ?format=webp
        return data;
    });

    server.get('/image/:id', async (req, res) => {
        const { id } = req.params;
        const { format } = req.query;

        if (!id || !isNaN(id)) {
            res.status(400);
            return {
                error: 'Invalid ID',
                message: 'No ID provided'
            }
        }

        const data = db.prepare('SELECT * FROM images WHERE id=? ORDER BY RANDOM() LIMIT 1;').get(id);

        if (data === undefined) { // If the ID isn't found
            res.status(404);
            return {
                error: 'Invalid ID',
                message: 'ID Not Found'
            };
        }

        data.file = config.database.cdn + data.file + ((format === 'webp') ? '.webp' : '.jpg'); // Support ?format=webp
        return data;
    });

    server.get('/image/categories', async () => {
        const categories = db.prepare('SELECT DISTINCT d.category FROM images AS s INNER JOIN images AS d ON s.category = d.category;').all();
        return categories.map(item => item.category);
    });

    server.get('/image/photographers', async () => {
        const photographers = db.prepare('SELECT DISTINCT d.photographer FROM images AS s INNER JOIN images AS d ON s.photographer = d.photographer;').all();
        return photographers.map(item => item.photographer);
    });

    server.get('/image/unsplash', async (_req, res) => {
        const data = await (await fetch(`https://api.unsplash.com/photos/random?client_id=${config.unsplashKey}&query=nature&content_filter=high&featured=true&orientation=landscape`).send()).json();
        res.send({
          file: data.urls.full + '&w=1920',
          photographer: data.user.name,
          location: data.location.city + ' ' + data.location.country,
          photographer_page: data.user.links.html + '?utm_source=mue&utm_medium=referral'
        });
        await fetch(`${data.links.download_location}?client_id=${config.unsplashKey}`).send(); // api requirement
    });
};