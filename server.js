// npm start >>> node server.js >> nodemon (sudo npm i -g nodemon)
'use strict';

require('dotenv').config();

let key;
let LocURL;

// Application Dependencies
const express = require('express');
//CORS = Cross Origin Resource Sharing
const cors = require('cors');
// client-side HTTP request library
const superagent = require('superagent');

// Application Setup
const PORT = process.env.PORT || 3030;
const app = express();
app.use(cors());

//Routes
app.get('/', handlerHome);
app.get('/location', handlerLocation);
app.get('/weather', handlerWeather);
app.get('/parks', handlerParks);
app.get('*', handlerWrong);

// handler function
function handlerHome(req, res) {
    res.send('you server is working')
}

function handlerLocation(req, res) {
    let cityName = req.query.city;
    key = process.env.GEOCODE_API_KEY;

    LocURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;
    superagent.get(LocURL) //send request to LocationIQ API
        .then(data => {
            let body = data.body
            console.log(body);
            let locationData = new Location(cityName, body);
            res.send(locationData);
        })
        .catch(error => {
            res.send(error);
        })
}


function handlerWeather(req, res) {
    const city = req.query.city;

    key = process.env.WEATHER_API_KEY;
    LocURL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${key}`

    superagent.get(LocURL) //send request to LocationIQ API
        .then(data => {
            let body = data.body
            const arrWeather = body.data.map((element) => {
                let newWeather = new Weather(element);
                return newWeather;
            });
            res.send(arrWeather);
        })
        .catch(error => {
            res.send(error);
        })
}

function handlerParks(req, res) {

    console.log('in parks')

    key = process.env.PARKS_API_KEY;
    let city = req.query.city;
    console.log(city);
    LocURL = `https://developer.nps.gov/api/v1/parks?q=${city}&limit=10&api_key=${key}`;
    superagent.get(LocURL)
        .then(element => {
            let body = element.body.data
            let newPark = body.map(parkData => new Park(parkData));
            // console.log(newPark[0].fee);
            res.status(200).send(newPark);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function handlerWrong(req, res) {
    let errObj = {
        status: 500,
        responseText: "Sorry, something went wrong"
    }
    res.status(500).send(errObj);
}

//constructor
function Location(city, locData) {
    this.search_query = city;
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
}

function Weather(weathObj) {
    this.forecast = weathObj.weather['description'];
    this.time = weathObj.datetime;
}

function Park(parkData) {
    this.name = parkData.fullName;
    this.address = Object.values(parkData.addresses[0]).join(',');
    this.fee = '0.00';
    this.description = parkData.description;
    this.url = parkData.url;
}

app.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`)
});
