module.exports = ({ server, log, db }) => {
    server.get('/getQuote', async (req) =>  {
        if (req.query.language) {
            const ifExists = db.prepare('SELECT EXISTS (SELECT language FROM quotes WHERE category=? LIMIT 1);').get(req.query.language.toLowerCase());
            if (JSON.parse(Object.values(ifExists)) === 0) {
                res.status(400);
                return {
                    error: 'Invalid Language',
                    message: 'Language Not Found'
               };
            }
            return db.prepare('SELECT * FROM quotes WHERE language=? ORDER BY RANDOM() LIMIT 1;').get(req.query.language.toLowerCase()); 
        }
        else return db.prepare('SELECT * FROM quotes WHERE language=? ORDER BY RANDOM() LIMIT 1;').get('English');
    });

    server.get('/getQuote/:id', async (req, res) => {
        const latest = db.prepare('SELECT * FROM quotes ORDER BY ID DESC LIMIT 1;').get();
        if (isNaN(req.params.id) || req.params.id > latest.id) {
            log.error(`Failed to get quote id ${req.params.id}`);
            res.status(400); // Use proper 400 status
            return {
                error: 'Invalid ID',
                message: 'ID Not Found'
            };
        }
        return db.prepare('SELECT * FROM quotes WHERE id=? ORDER BY RANDOM() LIMIT 1;').get(req.params.id);
    });

    server.get('/getQuoteLanguages', async () => {
        const languages = db.prepare('SELECT DISTINCT d.language FROM quotes AS s INNER JOIN quotes AS d ON s.language = d.language;').all();
        return languages.map(item => item.language);
    });
};