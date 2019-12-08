//* Imports
const fastify = require('fastify')();
const db      = require('better-sqlite3')('mue.db');
const log     = require('leekslazylogger');
const cat     = require('./categories.json');

///* Set Things 
log.init('MueAPI');
fastify.register(require('fastify-cors'));
fastify.register(require('fastify-no-icon'));
fastify.register(require('fastify-rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

//* Functions
const prepareString = (string) => {
  const toUpper = string.charAt(0).toUpperCase() + string.slice(1);
  return toUpper.replace('"', '');
}

//* Routes
// Public
fastify.get('/', async () => {
  log.info('Request made to /');
  return {
    message: 'Hello world! Documentation can be found at https://apidocs.muetab.xyz'
  };
});

fastify.get('/getImage', async (req) => {
  log.info('Request made to /getImage');
  if (req.query.category) {
    if (!cat.includes(prepareString(req.query.category))) {
      log.error(`User attempted to set category as ${req.query.category}`);
      return {
        message: 'Category not found'
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
  const latest = db.prepare('SELECT * FROM images ORDER BY ID DESC LIMIT 1;').get();
  if (isNaN(req.params.id) || req.params.id > latest.id) {
    log.error(`Failed to get image id ${req.params.id}`);
    return { 
      message: 'Invalid ID'
    }
  }
  return db.prepare(`SELECT * FROM images WHERE id="${req.params.id}" ORDER BY RANDOM() LIMIT 1;`).get();
});

fastify.get('/getQuote', async (req) =>  {
  log.info('Request made to /getQuote');
  return db.prepare('SELECT * FROM quotes WHERE language="English" ORDER BY RANDOM() LIMIT 1;').get();
  //else return db.prepare(`SELECT * FROM quotes WHERE language="${req.query.language}" ORDER BY RANDOM() LIMIT 1;`).get();
});

fastify.get('/getQuote/:id', async (req) =>  {
  log.info('Request made to /getQuote');
  log.info(`Attempting to get quote id ${req.params.id}`);
  const latest = db.prepare('SELECT * FROM quotes ORDER BY ID DESC LIMIT 1;').get();
  if (isNaN(req.params.id) || req.params.id > latest.id) {
    log.error(`Failed to get quote id ${req.params.id}`);
    return { 
      message: 'Invalid ID'
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

fastify.get('*', async () => {
  return {
    message: '404'
  }
});

//* Listen on port
fastify.listen(2815, log.info('Fastify server started'));
