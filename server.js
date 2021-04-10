// npm start >>> node server.js >> nodemon (sudo npm i -g nodemon)
'use strict';

require('dotenv').config();

let key;
let URL;
let city;

// Application Dependencies
const express = require('express');
const pg = require('pg');
//CORS = Cross Origin Resource Sharing
const cors = require('cors');
// client-side HTTP request library
const superagent = require('superagent');

// Application Setup
const PORT = process.env.PORT || 3030;
const app = express();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false }});


client.on('error', err => {
    console.log('unable to connect database');
});


app.use(cors());

//Routes
app.get('/', handlerHome);
app.get('/location', handlerLocation);
app.get('/weather', handlerWeather);
app.get('/parks', handlerParks);
app.get('/movies', handlerMovies);
app.get('/yelp', handlerYelp);

app.get('*', handlerWrong);

// handler function
function handlerHome(req, res) {
    res.send('you server is working')
}

function handlerLocation(req, res) {
    let city = req.query.city;
    key = process.env.GEOCODE_API_KEY;

    const sqlTable = 'SELECT * FROM locations WHERE search_query=$1;';

    client.query(sqlTable, [city]).then(locationData => {
        if (locationData.rows.length === 0) {

            URL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;
            superagent.get(URL) //send request to LocationIQ API
                .then(data => {
                    // console.log(data.body[0]);
                    let newLocation = new Location(city, data.body[0]);
                    const sql = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) ';
                    const safeValues = [newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude];
                    client.query(sql, safeValues).then(result => {
                        // console.log(result);
                    });
                    res.status(200).send(newLocation);

                })
                .catch((error) => {
                    res.status(500).send(`something ${error}`);
                });
        } else {
            const loc = locationData.rows[0];
            res.status(200).send(loc);
        }
    });
}


function handlerWeather(req, res) {
     city = req.query.search_query;

    key = process.env.WEATHER_API_KEY;
    URL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${key}`

    superagent.get(URL) //send request to LocationIQ API
        .then(data => {
            let body = data.body
            const newLocationWeather = body.data.map((element) => {
                let newWeather = new Weather(element);
                return newWeather;
            });
            res.send(newLocationWeather);
        })
        .catch(error => {
            res.send(error);
        })
}

function handlerParks(req, res) {

    // console.log('in parks')

    key = process.env.PARKS_API_KEY;
    let city = req.query.search_query;
    // console.log(city);
    URL = `https://developer.nps.gov/api/v1/parks?q=${city}&limit=10&api_key=${key}`;
    superagent.get(URL)
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

function handlerMovies(req, res) {

    console.log('in movie')

    key = process.env.MOVIE_API_KEY;
    city = req.query.search_query;
    console.log(city);
    URL = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${city}`;
    superagent.get(URL)
        .then(element => {
            //     let body = element.body;
            //     let newMov = new Movie(body);
            //     console.log('body',newMov);
            //     res.status(200).send(newMov);
            // })

            let body = JSON.parse( element.text.split(','));
            let newMovie = body.results.map(data=> new Movie(data));
            // let newMovie =  new Movie(body);

            console.log(newMovie);
            res.status(200).send(newMovie)
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function handlerYelp(req, res) {
    console.log('in yelp');
    city = req.query.search_query;
    let page=req.query.page;
    key = process.env.YELP_API_KEY;
    let starterPage= (page-1)*5
    URL =  `https://api.yelp.com/v3/businesses/search?location=${city}&term=restaurants&limit=5&offset=${starterPage}`;
    
    superagent.get(URL).set('Authorization', `Bearer ${key}`)
        .then(element => {
            let body = element.body.businesses;
            console.log(body)
            let newYelp= body.map(data => new Yelp(data))
            res.send(newYelp);
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
    this.formatted_query = locData.display_name;
    this.latitude = locData.lat;
    this.longitude = locData.lon;
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

function Movie(data) {
    this.title = data.original_title;
    this.overview = data.overview;
    this.average_votes = data.vote_average;
    this.total_votes = data.vote_count;
    this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    this.popularity = data.popularity;
    this.released_on = data.release_date;
}

function Yelp(data){
    this.name=data.name;
    this.image_url=data.image_url;
    this.price=data.price;
    this.rating=data.rating;
    this.url=data.url;
}


// listen
client.connect().then(() => {

    app.listen(PORT, () => {
        console.log(`Listening on PORT ${PORT}`)
    });

})
