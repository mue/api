//* Imports
const fastify = require('fastify')();
const log = require('leekslazylogger');
const config = require('./config.json');
const db = require('better-sqlite3')(config.database);
const cat = require('./categories.json');

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
const prepareString = (string) => {
  const toUpper = string.charAt(0).toUpperCase() + string.slice(1); // Set the category to uppercase
  return toUpper.replace('"', ''); // Replace dodgy character "
}

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
    if (!cat.includes(prepareString(req.query.category))) {
      log.error(`User attempted to set category as "${req.query.category}"`);
      res.status(400); // Use proper 400 status
      return {
        statusCode: 400,
        error: 'Invalid Category',
        message: 'Category Not Found'
      }
    }
    log.info(`Attempting to get image from ${req.query.category}`);
    return db.prepare(`SELECT * FROM images WHERE category="${prepareString(req.query.category)}" ORDER BY RANDOM() LIMIT 1;`).get();
  }
  else {
    log.info('Getting random image');
    return db.prepare('SELECT * FROM images ORDER BY RANDOM() LIMIT 1;').get();
  }
});

fastify.get('/getImage/:id', async (req) => {
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
  return db.prepare(`SELECT * FROM images WHERE id="${req.params.id}" ORDER BY RANDOM() LIMIT 1;`).get();
});

fastify.get('/getQuote', async (_req) =>  {
  log.info('Request made to /getQuote');
  return db.prepare('SELECT * FROM quotes WHERE language="English" ORDER BY RANDOM() LIMIT 1;').get();
  //else return db.prepare(`SELECT * FROM quotes WHERE language="${req.query.language}" ORDER BY RANDOM() LIMIT 1;`).get();
});

fastify.get('/getQuote/:id', async (req) =>  {
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
  return db.prepare(`SELECT * FROM quotes WHERE id="${req.params.id}" ORDER BY RANDOM() LIMIT 1;`).get();
});

fastify.get('/getUpdate', async () => {
  log.info('Request made to /getUpdate');
  return require('./update.json');
});

fastify.get('/getCategories', async () => {
  log.info('Request made to /getCategories');
  return require('./categories.json');
});

//* Listen on port
fastify.listen(config.port, log.info('Fastify server started'));