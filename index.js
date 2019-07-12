const http = require("http");
const url = require("url");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const mysql = require("mysql");

//requires .env file to have
//API_KEY=yourYandexDictionaryApiKey
//DB_HOST=dbHost
//DB_USER=dbUser
//DB_PASS=dbPass
//DB_NAME=dbName
dotenv.config();

const con = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
});

http.createServer(async function(req, res) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Content-Type", "application/json");

	if (req.url.startsWith("/translate")) {
		const query = url.parse(req.url, true).query;
		const apiKey = process.env.API_KEY,
					languageFrom = query.languageFrom,
					languageTo = query.languageTo,
					word = query.word;

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

		res.write(JSON.stringify(result));
	} else if (req.url.startsWith("/login")) {

	} else if (req.url.startsWith("/signup")) {

	}

	res.end();
}).listen(5000);
