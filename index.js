const express = require("express");
const session = require('express-session');
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const cors = require("cors")
const Datastore = require('nedb');
const NedbSessionStore = require('nedb-session-store')(session);
const bcrypt = require('bcryptjs');

//requires .env file to have
//API_KEY=yourYandexDictionaryApiKey
//SESS_SECRET=yourSessionSecret
dotenv.config();
const {
	API_KEY,
	SESS_SECRET,
	PORT = 5000,
	SESS_NAME = 'sid',
	SESS_LIFETIME = 30 * 24 * 60 * 60 * 1000,
} = process.env;

const app = express();
app.use(cors()); //dev

const db = new Datastore({ filename: 'database/db.json' });
db.loadDatabase(function(err) {
	if (err) {
		console.log("Error loading database:");
		console.error(err);
	}
});

app.use(express.static('public'));
app.use(session({
	name: SESS_NAME,
	resave: false,
	saveUninitialized: false,
	secret: SESS_SECRET,
	cookie: {
		maxAge: SESS_LIFETIME,
	},
	store: new NedbSessionStore({
		filename: 'database/sessions.json'
	})
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ strict: true }));

app.post('/login', function(req, res) {
	const {login, password} = req.body;

	if (!login || !password) {
		res.json({
			code: 0,
			errorMessages: ["You have to enter both login and password"]
		});
		return;
	}

	db.find({ login: login.trim() }, async function(err, docs) {
		if (err) {
			res.json({
				code: 1,
				errorMessages: ["We have some server-side problem, please retry later"]
			});
		} else if (docs.length===0) {
			res.json({
				code: 0,
				errorMessages: ["Incorrect login or password"]
			});
		} else { //found user
			const passwordCorrect = await bcrypt.compare(password, docs[0].hash);
			if (passwordCorrect) {
				req.session.login = login;
				res.cookie('isLoggedIn', '1');
				res.json({ code: 200 });
			}
		}
	});
});

app.post('/signup', async function(req, res) {
	const {login, email, password1, password2} = req.body;

	errorMessages = [];

	if (!login || !login.trim()) {
		errorMessages.push('You have to enter your login');
	}
	if (!email || !email.trim()) {
		errorMessages.push('You have to enter your email');
	}

	if (!password1) {
		errorMessages.push('You have to enter your password');
	} else if (password1!==password2) {
		errorMessages.push('Passwords dont match');
	} else {
		if (password1.length<9) {
			errorMessages.push('Your password has to be at least 9 letters long');
		}
	}

	if (errorMessages.length!==0) {
		res.json({
			code: 0,
			errorMessages
		});
	} else {
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password1, salt);

		//Check if user with this username/email already exists
		db.find(
			{ $or: [{ login: login.trim() }, { email: email.trim() }] },
			function(err, docs) {

				//Neighter username nor email have been used, everything ok
				if (docs.length===0) {
					db.insert({
						login,
						email,
						hash
					});
					res.json({code: 200});
				}

				//Both username and email have been used
				if (docs.length===2) {
					res.json({
						code: 0,
						errorMessages: ['User with this login and email already exists']
					});
				}

				//Eighter username or email has been used
				if (docs.length===1) {
					const usedLogin = docs[0].login===login.trim();
					const usedEmail = docs[0].email===email.trim();

					if (usedLogin && usedEmail) {
						res.json({
							code: 0,
							errorMessages: ['User with this login and email already exists']
						});
					} else if (usedLogin) {
						res.json({
							code: 0,
							errorMessages: ['User with this login already exists']
						});
					} else { //if (usedEmail)
						res.json({
							code: 0,
							errorMessages: ['User with this email already exists']
						});
					}
				}

			}
		);
	}
});

app.post('/logout', function(req, res) {
	req.session.destroy(err => {
		res.clearCookie('isLoggedIn');
		res.json({ code: 200 });
	});
});

app.get('/userInfo', function(req, res) {
	if (req.session.login) {
		res.json(req.session);
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
