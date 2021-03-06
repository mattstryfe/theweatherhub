'use strict';

angular.module('myApp.blog', ['ngRoute'])

  .config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/blog', {
      templateUrl: 'views/blog/blog.html',
      controller: 'BlogCtrl as blog'
    });
  }])

  .controller('BlogCtrl', [function() {
    this.title = "Blog";
    this.details = 'Capturing the new build, day-by-day.  Also some ideas and current events.'
  }]);