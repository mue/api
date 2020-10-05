module.exports = ({ server, log, db }) => {
    server.get('/getQuote', async () =>  {
        return db.prepare('SELECT * FROM quotes WHERE language=? ORDER BY RANDOM() LIMIT 1;').get('English');
        //else return db.prepare(`SELECT * FROM quotes WHERE language="${req.query.language}" ORDER BY RANDOM() LIMIT 1;`).get();
    });

    server.get('/getQuote/:id', async (req, res) =>  {
        log.info(`Attempting to get quote id ${req.params.id}`);
        const latest = db.prepare('SELECT * FROM quotes ORDER BY ID DESC LIMIT 1;').get(); // Get the last ID in the database
        if (isNaN(req.params.id) || req.params.id > latest.id) { // Check if ID is number and if it is larger than the last ID in the database
            log.error(`Failed to get quote id ${req.params.id}`);
            res.status(400); // Use proper 400 status
            return {
                statusCode: 400,
                error: 'Invalid ID',
                message: 'ID Not Found'
            };
        }
        return db.prepare('SELECT * FROM quotes WHERE id=? ORDER BY RANDOM() LIMIT 1;').get(req.params.id);
    });
};