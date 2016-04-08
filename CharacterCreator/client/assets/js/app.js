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
		$scope.currentTab = 0;
		$scope.armourRating = 0;
		$scope.constructedDamageBonus = {
			"dmg_dice" : 0, "dmg_diceType" : 0, "dmg_operator" : "", "dmg_display" : ""
		};

		var operators = {
			'+': function(a, b){ return a+b},
			'*': function(a, b){ return a*b},
			'/': function(a, b){ return a/b},
			'-': function(a, b){ return a-b}
		};

		loadJSON('./assets/json/data.json');

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

		// Calculate all values dependend on base stats
		$scope.calculateDependencies = function(key, stat){
			// calcualte ability base values
			calculateAbilityValues($scope.data.abilities);

			// calculate dmg bonus
			if(key == 'str' || key == 'siz') {
				var v = $scope.data.player.stats_base.str.value + $scope.data.player.stats_base.siz.value;
				var result = 0;
				$scope.data.player.stats_calc.dmg_bonus.value = constructDamageBonus(v);
			}

			if(key == 'con' || key == 'siz') {
				// calculate max hp
				var v = $scope.data.player.stats_base.con.value + $scope.data.player.stats_base.siz.value;
				if (v > 0) {
					// calculate current hp if not set
					$scope.data.player.stats_calc.hp_max.value = Math.ceil(v / 2);
					if ($scope.isUndefined($scope.data.player.stats_calc.hp.value)) {
						$scope.data.player.stats_calc.hp.value = Math.ceil(v / 2);
					}
					// reduce current hp if max hp is reduced too much
					$scope.reducePointsIfHigherThanMaxValue("hp","hp_max");
				}
			}

			if (key == 'pow') {
				// calculate max sanity
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;

				$scope.calculateMaxSanity();

				// calculate current sanity if not set
				if ($scope.isUndefined($scope.data.player.stats_calc.san.value)) {
					$scope.data.player.stats_calc.san.value = v;
				}
				// reduce current sanity if max sanity is reduced too much
				$scope.reducePointsIfHigherThanMaxValue("san","san_max");

				// calculate luck
				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.luck.value = v;

				//calculate max magic
				$scope.data.player.stats_calc.magic_max.value = stat.value;
				if ($scope.isUndefined($scope.data.player.stats_calc.magic.value)) {
					$scope.data.player.stats_calc.magic.value = stat.value;
				}
				// calculate current sanits if not set
				if ($scope.isUndefined($scope.data.player.stats_calc.magic.value)) {
					$scope.data.player.stats_calc.magic.value = v;
				}

				// reduce current magic if max magic is reduced too much
				$scope.reducePointsIfHigherThanMaxValue("magic","magic_max");
			}
			if (key == 'int') {
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.idea.value = v;
			}
			if (key == 'edu') {
				var v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.know.value = v;
			}
			if (key == 'dex') {
				var v = Math.round((stat.value * 0.3 * 100)) / 100 ;
				$scope.data.player.stats_calc.range.value = v + "m";
			}
		};

		function constructDamageBonus(v) {
			var dmg_dice = 1, dmg_diceType = 6, dmg_operator = "+", result = "";

			if (v >= 2 && v <= 12 ) { dmg_operator = "-"; }
			else if (v >= 13 && v <= 16 ) { dmg_operator = "-"; dmg_diceType = 4;  }
			else if (v >= 17 && v <= 24 ) { dmg_dice = 0; dmg_diceType = 0; }
			else if (v >= 25 && v <= 32 ) { dmg_diceType = 4; }
			else if (v >= 33 && v <= 40 ) {  }
			else if (v >= 41 && v <= 56 ) { dmg_dice = 2; }
			else if (v >= 57 && v <= 72 ) { dmg_dice = 3; }
			else if (v >= 73 && v <= 88 ) { dmg_dice = 4; }
			else if (v >= 89) { dmg_dice = 5; }

			result = dmg_operator + dmg_dice;
			if (dmg_diceType > 0) result += 'D' + dmg_diceType;

			$scope.constructedDamageBonus.dmg_dice = dmg_dice;
			$scope.constructedDamageBonus.dmg_diceType = dmg_diceType;
			$scope.constructedDamageBonus.dmg_operator = dmg_operator;
			$scope.constructedDamageBonus.dmg_display = result;
			return result;
		}

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

		$scope.reducePointsIfHigherThanMaxValue = function(current, max) {
			if ($scope.data.player.stats_calc[current].value > $scope.data.player.stats_calc[max].value) {
				$scope.data.player.stats_calc[current].value = $scope.data.player.stats_calc[max].value;
			}
		};

		$scope.calculateMaxSanity = function() {
			for (var i = 0; i < $scope.data.abilities.common.length; i++){
				if (!$scope.isUndefined($scope.data.abilities.common[i].cthulhu_mythos)){
					$scope.data.player.stats_calc.san_max.value = 99 - $scope.data.abilities.common[i].value_added;

					$scope.reducePointsIfHigherThanMaxValue("san","san_max");
					break;
				}
				else {
					$scope.data.player.stats_calc.san_max.value = 99;
				}
			}
		};

		$scope.calculateDamageRolls = function(item) {
			var damageRolls = [];

			for (var i = 0; i < item.dmg_modifier.length; i++) {
				if(item.dmg_modifier[i].toString().indexOf("dmgb") >= 0){
					var temp = {"dmg_dice" : 0, "dmg_diceType" : 0, "dmg_operator" : "", "dmg_modifier" : [0], "dmg_flat" : 0, "dmgb_multiplier" : 1};

					if (($scope.constructedDamageBonus.dmg_diceType == item.dmg_diceType) && ($scope.isUndefined(item.dmgb_multiplier))) {
						temp.dmg_dice = $scope.constructedDamageBonus.dmg_dice + item.dmg_dice;
						temp.dmg_diceType = item.dmg_diceType;
						temp.dmg_operator = item.dmg_operator;
						temp.dmg_flat = getFlatDamage(item);
						damageRolls.push(temp);
					}
					else {
						temp.dmg_dice = $scope.constructedDamageBonus.dmg_dice + item.dmg_dice;
						temp.dmg_diceType = item.dmg_diceType;
						temp.dmg_operator = item.dmg_operator;
						temp.dmg_flat = getFlatDamage(item);
						damageRolls.push(temp);
					}

					for (var j = 0; j < item.dmg_modifier.length; j++) {

					}
				}
			}
		};

		function getFlatDamage(item){
			var flatDamage = 0;
			for (var i = 0; i < item.dmg_modifier.length; i++) {
				if (flatDamage > 0) break;
				flatDamage = (typeof item.dmg_modifier[i] === "number") ? item.dmg_modifier[i] : 0
			}
			return flatDamage;
		}

		// Get player status (hp, magic, sanity)
		$scope.getStatus = function(stat, minValue, value) {
			var status = '';

			if (stat == 'magic') {
				status = (value >= minValue && value < 1) ? 'unconscious' : 'normal';
			}
			else if (stat == 'hitpoints') {
				if (value >= (minValue+1) && value < 1){
					status = 'unconscious';
				}
				else if (value == minValue) {
					status = 'dead';
				}
				else {
					status = 'normal';
				}
			}
			else if (stat == 'sanity') {
				status = (value >= minValue && value < 1) ? 'hopelessly insane' : 'normal';
			}

			return status;
		};

		// check if time period is vaild (display)
		$scope.validTimePeriod = function(time, mod) {
			mod = (mod == "not") ? false : true;

			if (typeof time === "undefined") return true;
			else if (time === "anytime") return true;
			else if ($scope.data.options.timeSelect.value == "anytime" || negateMaybe(time == $scope.data.options.timeSelect.value, mod)) return true;
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
				console.log($scope.data.abilities.custom[i].custom_name);
				if($scope.data.abilities.custom[i].custom_name == "") {
					$scope.data.abilities.custom.splice(i, 1);
				}
			}
		};

		$scope.handleSkillChanges = function(success, sub_type) {
			$scope.calculateMaxSanity();
			$scope.checkAvailableSkillPoints();
		};

		$scope.checkAvailableSkillPoints = function() {
			var obj = $scope.data.abilities;
			var v = 0;

			Object.keys($scope.data.abilities).forEach(function(key,index) {
				for (var i = 0; i < obj[key].length; i++){
					if (!$scope.isUndefined(obj[key][i].value_added)) {
						v += obj[key][i].value_added;
					}
				}
			});
			$scope.data.player.skillPoints_used = v;
		};

		$scope.playerHasArmour = function() {
			var v = 0;
			try {
				for (var i = 0; i < $scope.data.player.items.armour.length; i++ ) {
					v += $scope.data.player.items.armour[i].value
				}
				$scope.armourRating = v;
			}
			catch(err){}

			return ( v > 0 );
		};

		$scope.getWeaponSubTypeSkillChance = function(item) {
			var type = item.sub_type;
			var obj = $scope.data.abilities;
			var v = 0;

			Object.keys($scope.data.abilities).forEach(function(key,index) {
				for (var i = 0; i < obj[key].length; i++){
					if ( key != "custom") {
						//var skillName = obj[key][i].name[0].toLowerCase().replace(/ /g, '');
						var skillName = obj[key][i].sub_type;

						if (skillName == type) {
							v = obj[key][i].value_base + obj[key][i].value_added;
							obj[key][i].value_total = v;
						}
					}
				}
			});
			return (v > 0) ? v : item.value_base;
		};

		// synch success states between weapon skills and equipped weapons
		$scope.synchSuccessStates = function(state, type){
			if(typeof type === "undefined") return;
			var obj = $scope.data.abilities;
			var items = $scope.data.player.items.weapons_available;
			var group = [];
			var v = 0;

			Object.keys(items).forEach(function(key,index) {
				for (var i = 0; i < items[key].length; i++){
					if(items[key][i].sub_type == type){
						group.push(items[key][i]);
					}
				}
			});

			Object.keys(obj).forEach(function(key,index) {
				for (var i = 0; i < obj[key].length; i++){
					if (key != "custom") {
						var skillName = obj[key][i].sub_type;
						if (skillName == type) {
							if (obj[key][i].success) {
								for (var j = 0; j < group.length; j++){
									group[j].success = obj[key][i].success;
								}
							}
							if (!obj[key][i].success && state) {
								for (var j = 0; j < group.length; j++){
									group[j].success = true;
								}
								obj[key][i].success = state;
							}
						}
					}
				}
			});
		};

		/* Load JSON */
		function loadJSON(url){
			$http.get(url)
				.then(function(res){
					$scope.data = res.data;
					initCalculations();
				});
		}

		function initCalculations() {
			Object.keys($scope.data.player.stats_base).forEach(function(key,index) {
				$scope.calculateDependencies(key, $scope.data.player.stats_base[key]);
			})
		}

		/* Helpers */
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
		};

		$scope.isMaxStatValue = function(key){
			return key.indexOf('_max') < 1;
		};

		$scope.isVariableStat = function(key){
			switch (key) {
				case "hp" : return true;
				case "san" : return true;
				case "magic" : return true;
			}
		};

		function negateMaybe(v, check) {
			return check ? v : !v;
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
