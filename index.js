const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');


//config
const { SQLITE_FILE, PORT } = require('./config');
const queryRoute = require('./routes/query');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(SQLITE_FILE);

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((req,res,next) =>{req.db = db; next();});
app.use('/', queryRoute);

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });