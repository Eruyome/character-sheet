(function () {
	'use strict';

	var appModule = angular.module('application', [
		'ui.router',
		'ngAnimate',

		//foundation
		'foundation',
		'foundation.dynamicRouting',
		'foundation.dynamicRouting.animations'
	])
		.config(config)
		.run(run)
	;

	config.$inject = ['$urlRouterProvider', '$locationProvider'];

	function config($urlProvider, $locationProvider) {
		$urlProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled: false,
			requireBase: false
		});

		$locationProvider.hashPrefix('!');
	}

	function run() {
		FastClick.attach(document.body);
	}

	appModule.controller('CharacterController', ['$q', '$scope', '$http', function ($q, $scope, $http, $location) {

		$http.get('./assets/js/data.json')
			.then(function(res){
				$scope.data = res.data;
				console.log(res.data)
			});

		console.log(JSON.stringify($scope.data));
	}]);

	appModule.directive('sheet', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/sheet.html',
			// todo: shouldn't need to inherit entire scope
			scope: true
		};
	});
})();
