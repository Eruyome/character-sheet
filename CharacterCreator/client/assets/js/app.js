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
				initCalculations();
			});

		/* Tabs */
		$scope.onClickTab = function (tabId) {
			$scope.currentTab = tabId;
		};
		$scope.isActiveTab = function(tabId) {
			return tabId == $scope.currentTab;
		};

		/* Ability  Lists*/
		$scope.getLength = function(data, offset){
			try {
				var l = Math.ceil(data.abilities.common.length/2);
				if (data.abilities.common.length % 2) {
					l = l - offset;
				}
				return l;
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

							if(typeof obj[key][i].calc.modifier === "string") {
								modifier = $scope.data.player.stats_base[modifier].value;
							}

							currentStatValue = $scope.data.player.stats_base[stat].value;

							var v = operators[operator](currentStatValue, modifier);
							obj[key][i].value_calc = v < 99 ? v : 99;
						}
					}
					catch (err){}
				}
			});
		}

		function initCalculations() {
			Object.keys($scope.data.player.stats_base).forEach(function(key,index) {
				$scope.calculateDependencies(key, $scope.data.player.stats_base[key]);
			})
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

			if(key == 'con' || key == 'siz') {
				var v = $scope.data.player.stats_base.con.value + $scope.data.player.stats_base.siz.value;
				if (v > 0) {
					$scope.data.player.stats_calc.hp_max.value = Math.ceil(v / 2);
					if ($scope.isUndefined($scope.data.player.stats_calc.hp.value)) {
						$scope.data.player.stats_calc.hp.value = Math.ceil(v / 2);
					}
				}
			}

			if (key == 'pow') {
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.san_max.value = v;
				if ($scope.isUndefined($scope.data.player.stats_calc.san.value)) {
					$scope.data.player.stats_calc.san.value = v;
				}

				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.luck.value = v;

				$scope.data.player.stats_calc.magic_max.value = stat.value;
				if ($scope.isUndefined($scope.data.player.stats_calc.magic.value)) {
					$scope.data.player.stats_calc.magic.value = stat.value;
				}
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

		$scope.getStatus = function(stat, minValue, value) {
			var status = '';

			if (stat == 'magic') {
				status = (value >= minValue && value < 1) ? 'unconscious' : 'normal';
			}
			if (stat == 'hitpoints') {
				status = (value >= minValue && value < 1) ? 'unconscious' : 'normal';
			}
			if (stat == 'sanity') {
				status = (value >= minValue && value < 1) ? 'hopelessly insane' : 'normal';
			}

			return status;
		};

		$scope.validTimePeriod = function(time) {
			if (typeof time === "undefined") return true;
			else if ($scope.data.options.timeSelect.value == "anytime" || time == $scope.data.options.timeSelect.value) return true;
			else return false;
		};

		$scope.changeLanguage = function(){
			if ($scope.data.options.languageSelect.value == "English") {
				$scope.data.options.languageIndex = 0;
			}
			else if ($scope.data.options.languageSelect.value == "Deutsch") {
				$scope.data.options.languageIndex = 1;
			}
		};

		$scope.addCustomAbility = function() {
			var obj = {
				"name": [],
				"value_added" : 0,
				"value_total" : 0,
				"skilled" : false,
				"custom_name" : ""
			};

			$scope.data.abilities.custom.push(obj);
		};

		$scope.removeCustomAbility = function() {
			for (var i = 0; i < $scope.data.abilities.custom.length; i++) {
				if(!$scope.data.abilities.custom[i].skilled) {
					$scope.data.abilities.custom.splice(i, 1);
				}
			}
		};


		/* Helper */
		$scope.isUndefined = function(e){
			return typeof e === 'undefined';
		};
		$scope.isEmpty = function(e){
			return e.length;
		};

		$scope.calculateColspan = function(showValueBase){
			var count = 0;
			if(showValueBase) {
				count++;
			}
			return count;
		};

		$scope.range = function(count, added, offset){
			var range = [];
			for (var i = offset; i < (count + added); i++) {
				range.push(i)
			}
			return range;
		}
	}]);

	/* Filters */

	appModule.filter("max99", [function() {
		return function(v) {
			return v < 99 ? v : 99;
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
