module.exports = ({ server, db, logger }) => {
    server.get('/getQuote', async(_) => {
        logger.info('Request made to "/getQuote"');
        const all = await db.quotes.find().sort({ id: 1 }).toArray();
        
        const quote = all[Math.floor(Math.random() * all.length)];
        return {
          id: String(req.params.id),
          quote: quote.quote,
          language: quote.language,
          author: quote.author
        };
    });

    server.get('/getQuote/:id', async (req, res) => {
        logger.info('Request made to "/getQuote"');
        logger.info(`Getting quote with ID "${req.params.id}"`);
        const all = await db.quotes.find().sort({ id: 1 }).toArray();

        const latest = all[all.length - 1];
        if (isNaN(req.params.id) || req.params.id > latest.id) {
            logger.error(`Failed to get image with ID "${req.params.id}"`);
            res.status(400);
            return {
                statusCode: 400,
                message: 'ID was not found',
                error: 'Invalid ID'
            };
        }

        const quote = await db.quotes.findOne({ id: Number(req.params.id) });
        if (!quote || quote === null) {
          res.status(404);
          return {
            statusCode: 404,
            message: `ID of "${req.params.id}" was not found`
          };
        }

        return {
          id: String(req.params.id),
          quote: quote.quote,
          language: quote.language,
          author: quote.author
        };
    });
};