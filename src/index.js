//* Imports
const fastify = require('fastify')();
const log = require('leekslazylogger');
const config = require('./config.json');
const db = require('better-sqlite3')(config.database);

//* Set Things 
db.pragma('journal_mode = WAL'); // This makes sqlite FAST
log.init(config.logname);
fastify.register(require('fastify-cors'));
fastify.register(require('fastify-no-icon'));
fastify.register(require('fastify-rate-limit'), {
  max: config.ratelimit.max,
  timeWindow: config.ratelimit.timewin
});

//* Functions
const prepareString = (string) => string.charAt(0).toUpperCase() + string.slice(1); // Uppercase category input

//* Routes
fastify.get('/', async () => {
  log.info('Request made to /');
  return {
    message: config.helloworld
  };
});

fastify.get('/getImage', async (req, res) => {
  log.info('Request made to /getImage');
  if (req.query.category) {
    const ifExists = db.prepare(`SELECT EXISTS (SELECT category FROM images WHERE category=?);`).get(prepareString(req.query.category));
    if (ifExists['EXISTS (SELECT category FROM images WHERE category=?)'] === 0) {
      log.error(`User attempted to set category as "${req.query.category}"`);
      res.status(400); // Use proper 400 status
      return {
        statusCode: 400,
        error: 'Invalid Category',
        message: 'Category Not Found'
      }
    }
    log.info(`Attempting to get image from ${req.query.category}`);
    return db.prepare(`SELECT * FROM images WHERE category=? ORDER BY RANDOM() LIMIT 1;`).get(prepareString(req.query.category));
  }
  else {
    log.info('Getting random image');
    if (req.query.webp) {
      const data = db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();
      return {
        id: data.id,
        category: data.category,
        file: data.file.split('e/')[0] + 'e/webp' + data.file.split('/mue')[1].replace('.jpg', '.webp'),
        photographer: data.photographer,
        location: data.location
      }
    } else return db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();
  }
});

fastify.get('/getImage/:id', async (req, res) => {
  log.info('Request made to /getImage');
  log.info(`Attempting to get image id ${req.params.id}`);
  const latest = db.prepare('SELECT * FROM images ORDER BY ID DESC LIMIT 1;').get(); // Get the last ID in the database
  if (isNaN(req.params.id) || req.params.id > latest.id) { // Check if ID is number and if it is larger than the last ID in the database
    log.error(`Failed to get image id "${req.params.id}"`);
    res.status(400); // Use proper 400 status
    return { 
      statusCode: 400,
      error: 'Invalid ID',
      message: 'ID Not Found'
    }
  }
  return db.prepare(`SELECT * FROM images WHERE id=? ORDER BY RANDOM() LIMIT 1;`).get(req.params.id);
});

fastify.get('/getQuote', async (_req) =>  {
  log.info('Request made to /getQuote');
  return db.prepare('SELECT * FROM quotes WHERE language=? ORDER BY RANDOM() LIMIT 1;').get('English');
  //else return db.prepare(`SELECT * FROM quotes WHERE language="${req.query.language}" ORDER BY RANDOM() LIMIT 1;`).get();
});

fastify.get('/getQuote/:id', async (req, res) =>  {
  log.info('Request made to /getQuote');
  log.info(`Attempting to get quote id ${req.params.id}`);
  const latest = db.prepare('SELECT * FROM quotes ORDER BY ID DESC LIMIT 1;').get(); // Get the last ID in the database
  if (isNaN(req.params.id) || req.params.id > latest.id) { // Check if ID is number and if it is larger than the last ID in the database
    log.error(`Failed to get quote id ${req.params.id}`);
    res.status(400); // Use proper 400 status
    return { 
      statusCode: 400,
      error: 'Invalid ID',
      message: 'ID Not Found'
    }
  }
  return db.prepare(`SELECT * FROM quotes WHERE id=? ORDER BY RANDOM() LIMIT 1;`).get(req.params.id);
});

fastify.get('/getUpdate', async () => {
  log.info('Request made to /getUpdate');
  return require('./update.json');
});

fastify.get('/getCategories', async () => {
  log.info('Request made to /getCategories');
  const categories = db.prepare('SELECT DISTINCT d.category FROM images AS s INNER JOIN images AS d ON s.category = d.category;').all();
  let categoriesArray = [];
  categories.forEach(item => categoriesArray.push(item.category));
  return categoriesArray;
});

//* Listen on port
fastify.listen(config.port, log.info('Fastify server started'));