const db = require('better-sqlite3')(config.database);

//* Run SQL commands
db.prepare('CREATE TABLE images (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, url TEXT, photographer TEXT, location TEXT, camera TEXT, location TEXT);').run();
db.prepare('CREATE TABLE quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT, quote TEXT, language TEXT);').run();
