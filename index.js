const express = require("express");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const cors = require("cors")

//requires .env file to have
//API_KEY=yourYandexDictionaryApiKey
dotenv.config();

const app = express();

app.get('/translate', cors(), async function(req, res) {
	const apiKey = process.env.API_KEY,
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

	res.send(JSON.stringify(result));
});

app.listen(5000);
