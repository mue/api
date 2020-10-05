module.exports = ({ server, log, db }) => {
    server.get('/getImage', async (req, res) => {
        if (req.query.category) {
            log.info(`Attempting to get image from "${req.query.category}" category`);
            const ifExists = db.prepare('SELECT EXISTS (SELECT category FROM images WHERE category=?);').get(req.query.category);
            if (ifExists['EXISTS (SELECT category FROM images WHERE category=?)'] === 0) {
                log.warn(`Category "${req.query.category}" doesn't exist`);
                res.status(400); // Use proper 400 status
                return {
                    statusCode: 400,
                    error: 'Invalid Category',
                    message: 'Category Not Found'
                };
            }
            return db.prepare('SELECT * FROM images WHERE category=? ORDER BY RANDOM() LIMIT 1;').get(req.query.category);
        } else {
            log.info('Getting random image');
            if (req.query.webp) {
                const data = db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();
                return {
                    id: data.id,
                    category: data.category,
                    file: data.file.split('e/')[0] + 'e/webp' + data.file.split('/mue')[1].replace('.jpg', '.webp'),
                    photographer: data.photographer,
                    location: data.location,
                    camera: data.camera,
                    resolution: data.resolution
                };
            } else return db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();
        }
    });

    server.get('/getImage/:id', async (req, res) => {
        log.info(`Attempting to get image id ${req.params.id}`);
        const latest = db.prepare('SELECT * FROM images ORDER BY ID DESC LIMIT 1;').get(); // Get the last ID in the database
        if (isNaN(req.params.id) || req.params.id > latest.id) { // Check if ID is number and if it is larger than the last ID in the database
            log.error(`Failed to get image id ${req.params.id}`);
            res.status(400); // Use proper 400 status
            return {
                statusCode: 400,
                error: 'Invalid ID',
                message: 'ID Not Found'
            };
        }
        return db.prepare('SELECT * FROM images WHERE id=? ORDER BY RANDOM() LIMIT 1;').get(req.params.id);
    });

    server.get('/getCategories', async () => {
        const categories = db.prepare('SELECT DISTINCT d.category FROM images AS s INNER JOIN images AS d ON s.category = d.category;').all();
        return categories.map(item => item.category);
    });

    server.get('/getPhotographers', async () => {
        const photographers = db.prepare('SELECT DISTINCT d.photographer FROM images AS s INNER JOIN images AS d ON s.photographer = d.photographer;').all();
        return photographers.map(item => item.photographer);
    });
};