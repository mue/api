module.exports = ({ server, db, config }) => {
    server.get('/getImage', async (req, res) => {
        let data;
        if (req.query.category) {
            const ifExists = db.prepare('SELECT EXISTS (SELECT category FROM images WHERE category=?);').get(req.query.category.toLowerCase());
            if (JSON.parse(Object.values(ifExists)) === 0) {
                res.status(400);
                return {
                    error: 'Invalid Category',
                    message: 'Category Not Found'
                };
            }
            data = db.prepare('SELECT * FROM images WHERE category=? ORDER BY RANDOM() LIMIT 1;').get(req.query.category.toLowerCase());
        } else data = db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();

        if (req.query.webp) data.file = config.database.cdn + data.file + '.webp';
        else data.file = config.database.cdn + data.file + '.jpg';
        return data;
    });

    server.get('/getImage/:id', async (req, res) => {
        const latest = db.prepare('SELECT * FROM images ORDER BY ID DESC LIMIT 1;').get(); // Get the last ID in the database
        if (isNaN(req.params.id) || req.params.id > latest.id) { // Check if ID is number and if it is larger than the last ID in the database
            res.status(400);
            return {
                error: 'Invalid ID',
                message: 'ID Not Found'
            };
        }

        let data = db.prepare('SELECT * FROM images WHERE id=? ORDER BY RANDOM() LIMIT 1;').get(req.params.id);
        if (req.query.webp) data.file = config.database.cdn + data.file + '.webp';
        else data.file = config.database.cdn + data.file + '.jpg';
        return data;
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