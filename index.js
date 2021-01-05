const path = require('path');
const dotenv = require('dotenv');
const { ENV_FILE } = process.env;
console.log(`Using ${ENV_FILE} env file.`);
dotenv.config({ path: path.resolve(process.cwd(), `./${ENV_FILE}`) });
var express = require('express');
var app = express();
var url = require('url');
var request = require('request');

var apikey = process.env.API_KEY;  //API key; will be set in Heroku

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//use port is set in the environment variable, or 9001 if it isn’t set.
app.set('port', (process.env.PORT || 9001));

//for testing that the app is running
app.get('/', function (req, res) {
    res.send('Running!!');
});

app.post('/post', function (req, res) {
    //take a message from Slack slash command
    var query = req.body.text;

    var locations_parsed_url = url.format({
        pathname: 'http://dataservice.accuweather.com/locations/v1/search', search: '?apikey=' + apikey + '&q=54115&details=false'
    });

    console.log('locations_parsed_url=' + locations_parsed_url);

    request(locations_parsed_url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);

            if (data.length > 0) {
                var location = data[0].Key;

                var location_name = data[0].EnglishName + ', ' + data[0].AdministrativeArea.EnglishName;

                var conditions_parsed_url = url.format({
                    pathname: 'http://dataservice.accuweather.com/currentconditions/v1/' + location, search: '?apikey=' + apikey + '&details=false'
                });

                console.log('conditions_parsed_url=' + conditions_parsed_url);

                request(conditions_parsed_url, function (error1, response1, body1) {
                    if (!error1 && response1.statusCode == 200) {
                        var data1 = JSON.parse(body1);
                        var temperature = data1[0].Temperature.Imperial.Value + '° ' + data1[0].Temperature.Imperial.Unit;
                        var weatherCondition = data1[0].WeatherText;
                        var icon_url = 'https://developer.accuweather.com/sites/default/files/' + data1[0].WeatherIcon.toString().padStart(2, "0") + '-s.png';

                        var response_body = {
                            response_type: "in_channel",
                            "attachments": [
                                {
                                    "text": "Location: " + location_name + "\n"
                                        + "Temperature: " + temperature + "\n"
                                        + "Condition: " + weatherCondition,
                                    "image_url": icon_url,
                                }
                            ]
                        };
                        res.send(response_body);
                    }
                });
            }
        }
    });
});

//tells Node which port to listen on
app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});