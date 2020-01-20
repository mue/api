const categories = require('../assets/categories.json');
const prepareCategoryString = require('../util/prepareCategoryString.js');

/**
 * @param {{ server: import('fastify').FastifyInstance, logger: any, db: import('../structures/Database') }}
 */
module.exports = ({ server, logger, db }) => {
    server.get('/getImage', async (req, res) => {
        logger.info('Request made to "/getImage"');
        if (req.query.category) {
            const category = prepareCategoryString(req.query.category);
            if (!categories.includes(category)) {
                logger.error(`User attempted to view category "${req.query.category}"`);
                res.status(404);
                return {
                    statusCode: 404,
                    message: `Category ${category} was not found`,
                    error: 'Invalid category'
                };
            }

            const all = db.images.find({
                category
            });

            return all.map(s => ({
              id: String(s.id),
              category: s.category,
              file: s.file,
              photographer: s.photographer,
              location: s.location
            }));
        } else {
            const all = await db.images.find().toArray();
            const s = all[Math.floor(Math.random() * all.length)];

            return {
              id: String(s.id),
              category: s.category,
              file: s.file,
              photographer: s.photographer,
              location: s.location
            };
        }
    });

    server.get('/getImage/:id', async (req, res) => {
        logger.info('Request made to "/getImage"');
        logger.info(`Attempting to find image with ID: ${req.params.id}`);
        const all = await db.images.find().sort({ id: 1 }).toArray();

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

        const image = await db.images.findOne({
            id: Number(req.params.id)
        });

        if (!image || image === null) {
          res.status(404);
          return {
            statusCode: 404,
            message: `Invalid ID: ${req.params.id}`
          };
        }

        return {
          id: String(image.id),
          category: image.category,
          file: image.file,
          photographer: image.photographer,
          location: image.location
        };
    });
};