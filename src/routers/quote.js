module.exports = ({ server, log, db }) => {
    server.get('/quote/random', async (req) =>  {
        const language = req.query.language || 'English';

        const data = db.prepare('SELECT * FROM quotes WHERE language=? ORDER BY RANDOM() LIMIT 1;').get(language);

        if (data === undefined) { // If the language isn't found
            res.status(400);
            return {
                error: 'Invalid Language',
                message: 'Language not found, look at /quote/languages for a list'
            };
        }

        return data;
    });

    server.get('/quote/:id', async (req, res) => {
        const { id } = req.params;

        if (!id || !isNaN(id)) {
            res.status(400);
            return {
                error: 'Invalid ID',
                message: 'No ID provided'
            }
        }
        
        const data = db.prepare('SELECT * FROM quotes WHERE id=? ORDER BY RANDOM() LIMIT 1;').get(id);

        if (data === undefined) { // If the language isn't found
            res.status(404);
            return {
                error: 'Invalid ID',
                message: 'ID Not Found'
            };
        }

        return data;
    });

    server.get('/quote/languages', async () => {
        const languages = db.prepare('SELECT DISTINCT d.language FROM quotes AS s INNER JOIN quotes AS d ON s.language = d.language;').all();
        return languages.map(item => item.language);
    });
};