module.exports = ({ server, db, logger }) => {
    server.get('/getQuote', async(_) => {
        logger.info('Request made to /getQuote');
        const all = await db.quotes.find().sort({ language: 'English' });
        return {
            statusCode: 200,
            quotes: all
        };
    });

    server.get('/getQuote/:id', async (req) => {
        logger.info('Request made to /getQuote');
        logger.info(`Getting quote with ID "${req.params.id}"`);
        const all = await db.quotes.find().sort({ id: 1 });
        console.log(all);

        const latest = all[all.length - 1];
        if (isNaN(req.params.id) || req.params.id > latest.id) {
            log.error(`Failed to get image with ID "${req.params.id}"`);
            res.status(400);
            return {
                statusCode: 400,
                message: 'ID was not found',
                error: 'Invalid ID'
            };
        }

        const quote = await db.quotes.findOne({ id: req.params.id });
        return quote;
    });
};