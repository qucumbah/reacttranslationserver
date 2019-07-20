const express = require("express");
const session = require('express-session');
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const cors = require("cors")

//requires .env file to have
//API_KEY=yourYandexDictionaryApiKey
//SESS_SECRET=yourSecret
dotenv.config();
const {
	API_KEY,
	SESS_SECRET,
	PORT = 5000,
	SESS_NAME = 'sid',
	SESS_LIFETIME = 30 * 24 * 60 * 60 * 1000,
} = process.env;

const app = express();

app.use(express.static('public'));
app.use(session({
	name: SESS_NAME,
	resave: false,
	saveUninitialized: false,
	secret: SESS_SECRET,
	cookie: {
		maxAge: SESS_LIFETIME,
	}
}));

app.post('/login', function(req, res) {

});

app.post('/signin', function(req, res) {

});

app.post('/logout', function(req, res) {

});

app.get('/userInfo', function(req, res) {
	if (req.session.userLogin) {

	} else {
		res.json({ code: 0 });
	}
});

app.get('/translate', cors(), async function(req, res) {
	const apiKey = API_KEY,
				languageFrom = req.query.languageFrom,
				languageTo = req.query.languageTo,
				word = req.query.word;

	const request = await fetch(`https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${apiKey}&lang=${languageFrom}-${languageTo}&text=`+word);
	const obj = await request.json();

	let code;
	let errorMessage;

	if (obj.code) { //Yandex API error
		code = obj.code;
		errorMessage = obj.message;
	} else if (obj.def.length===0) { //No translations
		code = 1;
		errorMessage = "Unknown word";
	} else { //All good
		code = 200;
	}

	const result = {
		code,
		errorMessage,
		def: obj.def
	}

	res.json(result);
});

app.listen(5000);
