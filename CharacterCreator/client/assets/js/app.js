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

	appModule.controller('characterController', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
		$scope.data = {};
		$scope.showUnskilled = true;
		$scope.showValueBase = true;
		$scope.languageIndex = 0;
		$scope.currentTab = 0;
		$scope.player = {
			"stats_base" : {
				"dex" : { "name" : ["DEX", "GE"], "value" : 10 },
				"edu" : { "name" : ["EDU", "BI"], "value" : 15 }
			}
		};

		/* Load JSON */
		$http.get('./assets/json/data.json')
			.then(function(res){
				$scope.data = res.data;
				console.log($scope.data.abilities);
			});

		/* Tabs */
		$scope.onClickTab = function (tabId) {
			$scope.currentTab = tabId;
		};
		$scope.isActiveTab = function(tabId) {
			return tabId == $scope.currentTab;
		};

		/* Ability  Lists*/
		$scope.getLength = function(data){
			try {
				return Math.floor(data.abilities.common.length/2)
			}
			catch(err){
				console.info('Data not ready yet.')
			}
		};

		var operators = {
			'+': function(a, b){ return a+b},
			'*': function(a, b){ return a*b},
			'/': function(a, b){ return a/b},
			'-': function(a, b){ return a-b}
		};

		function calculateAbilityValues(obj) {
			Object.keys(obj).forEach(function(key,index) {
				var length = obj[key].length;
				var stat, operator, modifier, currentStatValue;

				for (var i = 0; i <= length; i++) {
					try {
						if (typeof obj[key][i].calc !== "undefined") {
							stat = obj[key][i].calc.stat;
							operator = obj[key][i].calc.operator;
							modifier = obj[key][i].calc.modifier;
							currentStatValue = $scope.data.player.stats_base[stat].value;

							obj[key][i].value_calc = operators[operator](currentStatValue, modifier);
						}
					}
					catch (err){}
				}
			});
		}

		$scope.calculateDependencies = function(key, stat){

			// calcualte ability base values
			calculateAbilityValues($scope.data.abilities);

			// calculate dmg bonus
			if(key == 'str' || key == 'siz') {
				var v = $scope.data.player.stats_base.str.value + $scope.data.player.stats_base.siz.value;
				var result = 0;

				if (v >= 2 && v <= 12 ) { result = '-1D6' }
				else if (v >= 13 && v <= 16 ) { result = '-1D4' }
				else if (v >= 17 && v <= 24 ) { result = '+0' }
				else if (v >= 25 && v <= 32 ) { result = '+1D4' }
				else if (v >= 33) { result = '+1D6' }

				$scope.data.player.stats_calc.dmg_bonus.value = result;
			}

			if (key == 'pow') {
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.san.value = v;
				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.luck.value = v;
			}
			if (key == 'int') {
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.idea.value = v;
			}
			if (key == 'edu') {
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.know.value = v;
			}
		};


		/* Helper */
		$scope.isUndefined = function(e){
			return typeof e === 'undefined';
		};
	}]);

	/* Directives */

	appModule.directive('sheet', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/sheet.html',
			scope: true
		};
	});

	appModule.directive('ability', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/ability.html',
			scope: true,
			replace: true
		};
	});
	appModule.directive('ability2', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/ability2.html',
			scope: true,
			replace: true
		};
	})
})();
