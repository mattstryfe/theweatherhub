'use strict';

angular.module('myApp.swf', ['ngRoute', 'angular-json-tree'])

  .config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/swf', {
      templateUrl: 'views/swf/swf.html',
      controller: 'SwfCtrl as swf',
			css: 'views/swf/swf.css'
    });
  }])

  .controller('SwfCtrl', [
    '$http',
    function($http) {

      // this.newHero = {
      //   name: 'Spawn'
      // };

      // metadata for angular templates
      this.title = 'SWF';
      this.details = 'Simple Weather Forecast (SWF).  A simple daily forecast.  Data harvested from weather.gov\'s API.';

      // empty object for weatherData
      this.weatherData = {};        // passed in swf.html!
      this.trimmedData = {};        // passed in swf.html!
      this.finalWeatherData = {};   // passed in swf.html!

      // compile data settings
      const settings = {
        valuesToPull: [
          'temperature',
          'probabilityOfPrecipitation',
          'quantitativePrecipitation',
          'dewpoint',
          'maxTemperature',
          'minTemperature',
          'snowfallAmount'
        ]
      }

      // config for http requests
      this.config = {
        progress: {
          value: 0,
          status: '',
          buildUrl: {},
          getGeoCoords: {},
          getGridData: {},
          getForecastData: {}
				},
        user_zip: '',
        location: {
          city: null,
          state: null,
          geoCoords: {
            lat: '',
            lng: ''
          }
        },
        headers: {'User-Agent': 'request', 'Accept': 'application/geo+json', 'version': '1'},
        google: {
          base_url: 'https://maps.googleapis.com/maps/api/geocode/json?address=',
          full_url: '',
          key: '&key=AIzaSyAk8F3D59z5IRwcDfBc0B6eoRpyUx9JSPQ'
        },
        wGov: {
          base_url: 'https://api.weather.gov/points/',
          full_url: '',
          grid_url: ''
        }
      }


      this.getData = function (zip, config, weatherData, trimmedData, finalWeatherData) {
        return new Promise(function(resolve, reject) {
          // append zip to config object
          config.user_zip = zip;

          //build google url
          config.google.full_url = config.google.base_url + config.user_zip + config.google.key
          
          //update progress
          config.progress.buildUrl.value = 15;
          config.progress.buildUrl.status ='Asking google for things.';
          
          $http({method: 'GET', url: config.google.full_url})
          // GET GEOCOORDS
            .then(function(responseGeo) {
              // assign lat and lon to config
              //console.log('google response: ', responseGeo)
              config.location.geoCoords.lat = responseGeo.data.results[0].geometry.location.lat;
              config.location.geoCoords.lng = responseGeo.data.results[0].geometry.location.lng;

              // assign location values
              config.location.city  = responseGeo.data.results[0].address_components[1].long_name;
              config.location.state = responseGeo.data.results[0].address_components[2].long_name;

              // build and assign wGov Url
              config.wGov.full_url = config.wGov.base_url + config.location.geoCoords.lat + ',' + config.location.geoCoords.lng;
							
              //update progress
                config.progress.getGeoCoords.value = 25;
                config.progress.getGeoCoords.status = 'GeoCoords obtained...'
							
              return $http({method: 'GET', url: config.wGov.full_url})
            })
            .then(function(responseGov) {
              config.wGov.grid_url = responseGov.data.properties.forecastGridData

							//update progress
							config.progress.getGridData.value = 25;
              config.progress.getGridData.status = 'GRID complete!  Getting weather data...'
	
							return $http({method: 'GET', url: config.wGov.grid_url })
            })
            .then(function(responseData) {
              if(!responseData){
                return reject("Something went wrong")
              }

              weatherData.weatherData = responseData.data.properties
              
							//update progress
							config.progress.getForecastData.value = 35;
              config.progress.getForecastData.status = 'Weather data obtained.  Pull Complete!!'

              // Trim and process data.  Extract only what's needed.  trimmedData is made available here.
              processData(settings, weatherData.weatherData, trimmedData)

              // Prep data for UI.  Establish/mutate objects accordingly.  returns data by date.
              prepData(settings, trimmedData, finalWeatherData)

              // build liquid Gauges for UI
              //buildWaterGauge()

							resolve (responseData.data.properties)

            });
        });
      };

      function prepData (settings, processedWeatherData, finalWeatherData) {
        let dailyForecast = {};
        const forecastLength = 5;
        const today = moment().utc();
        const dateArr = [];
        // create an array of dates starting with now.
        // use forecast length to determine how many to make.
        for (let i=0; i < forecastLength; i++) {

          // push UTC to array
          // must use clone because moment mutates the original
          let date = today.clone().add(i, 'days').utc().format('YYYY-MM-DD')

          // push date to array for processing purposes.
          // this is strictly to make stepping through each date easier.
          dateArr.push(date)

          // append date to dailyForecast Object
          dailyForecast[date] = dailyForecast[date]

          // Force it to be an object because shut up!
          dailyForecast[date] = {}

          // for each valueToPull append the category to the object
          settings.valuesToPull.forEach((category) => {
            // make sure it knows category is an array
            dailyForecast[date][category] = [];
          });
          //console.log('dailyForecast', dailyForecast)
        }

        // Turn weather.gov's 'categorically grouped data' into 'date grouped data'.
        // Settings contains an array of values to pull from the forecast.
        // For each one, get the dateArr and establish a day.
        // Once a [category] and [day] are established, start stripping the shitty weather.gov
        // response into usable information.
        // Push each array to the corresdonding day.category.
        // ex: 2017-11-23.dewpoint[validTime: 'time', value: '4]
        settings.valuesToPull.forEach((category) => {
          dateArr.forEach((day) => {
						processedWeatherData.trimmedData[category].values.forEach((element) => {
							//console.log('all elements: ', element)
							if (element.validTime.includes(day)) {
								dailyForecast[day][category].push(element)
							}
						});
					})
        })

        // working copy using angular.forEach incase needed later.
        /*angular.forEach(settings.valuesToPull, (category) => {
          angular.forEach(dateArr, (day) => {
            angular.forEach(processedWeatherData.trimmedData[category].values, (element) => {
              if(element.validTime.includes(day)) {
								dailyForecast[day][category].push(element)
              }
            });
					});
        });*/

        // assign dailyForecast to finalWeatherData.finalWeatherData.
        // This must be passed via the ng-click in swf.html
        finalWeatherData.finalWeatherData = dailyForecast
      }

      function processData (settings, weatherData, trimmedData) {
        let targetedWeatherData = {};
        console.log('weatherData', weatherData);

        // assign valuesToPull to new object.
        angular.forEach(settings.valuesToPull, (targetPropVal, k) => {
          // copy specific target object data to parsedWeatherData
          targetedWeatherData[targetPropVal] = Object.assign({}, weatherData[targetPropVal])

          // this strips all the ISO8601 php duration timestamp nonsense from the validTime values
          angular.forEach(targetedWeatherData[targetPropVal].values, (v, k) => {
            // cut the end off the ISO8601 time and place it with nothing.
            // commented to allow cleaner time conversion in D3
            // let newTime = v.validTime.substring(0, v.validTime.indexOf('/'))
            let newTime = v.validTime.substring(0, v.validTime.indexOf('+'))
            // write new time back to object
            v.validTime = newTime;
          });
        });

				// assign targetedWeatherData to trimmedData.trimmedData.
				// This must be passed via the ng-click in swf.html
        trimmedData.trimmedData = targetedWeatherData
      }

      this.calcTempColor = function(temp) {
        temp += temp * 1.8 + 32;

        if (temp > 100) {
          return 'red';
        } else if (temp> 75) {
          return 'orange';
        } else if (temp > 50) {
          return 'green';
        } else if (temp > 30) {
          return 'blue';
        } else if (temp > 0) {
          return 'lightblue';
        }
      }
}]);