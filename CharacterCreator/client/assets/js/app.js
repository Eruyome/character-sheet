(function () {
	'use strict';

	var appModule = angular.module('application', [
			'ui.router',
			'ngAnimate',
			'ui.bootstrap',
			'ngFileUpload',
			'LocalStorageModule',
			//'$window',

			//foundation
			'foundation',
			'foundation.dynamicRouting',
			'foundation.dynamicRouting.animations'
		])
			.config(config)
			.run(run)
		;

	config.$inject = ['$urlRouterProvider', '$locationProvider', 'localStorageServiceProvider'];

	function config($urlProvider, $locationProvider, localStorageServiceProvider) {
		$urlProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled: false,
			requireBase: false
		});

		$locationProvider.hashPrefix('!');

		localStorageServiceProvider
			.setStorageType('localStorage');
		localStorageServiceProvider
			.setPrefix('cthulhuCharacter');
	}

	function run() {
		FastClick.attach(document.body);
	}

	appModule.controller('characterController', ['$scope', '$http', 'Upload', '$timeout', '$location', '$window', 'localStorageService', function ($scope, $http, Upload, $timeout, $location, $window, localStorageService) {
		$scope.data = {};
		$scope.currentTab = 0;
		$scope.armourRating = 0;
		$scope.selectedItemList = {};
		$scope.selectedItemListTime = "anytime";
		$scope.showRemovable = true;
		$scope.diceRollResult = {};
		$scope.tempDiceResults = [];
		$scope.predicate = 'name[0]';
		$scope.fireFromCoreRange = false;
		$scope.build = {};
		$scope.build.character = true;
		$scope.constructedDamageBonus = {
			"dmg_dice": 0, "dmg_diceType": 0, "dmg_operator": "", "dmg_display": ""
		};

		var operators = {
			'+': function (a, b) {
				return a + b;
			},
			'*': function (a, b) {
				return a * b;
			},
			'/': function (a, b) {
				return a / b;
			},
			'-': function (a, b) {
				return a - b;
			}
		};

		loadData();

		/* Tabs */
		$scope.onClickTab = function (tabId) {
			$scope.currentTab = tabId;
		};
		$scope.isActiveTab = function (tabId) {
			return tabId == $scope.currentTab;
		};

		/* Ability  Lists*/
		$scope.getLength = function (data, offset) {
			try {
				var l = Math.ceil(data.abilities.common.length / 2);
				if (data.abilities.common.length % 2) {
					l = l - offset;
				}
				return l;
			}
			catch (err) {
				console.info('Data not ready yet.');
			}
		};

		// Calculate all values dependend on base stats
		$scope.calculateDependencies = function (key, stat) {
			var v = 0;
			// calculate ability base values
			calculateAbilityValues($scope.data.abilities);

			// calculate dmg bonus
			if (key == 'str' || key == 'siz') {
				v = $scope.data.player.stats_base.str.value + $scope.data.player.stats_base.siz.value;
				var result = 0;
				$scope.data.player.stats_calc.dmg_bonus.value = constructDamageBonus(v);
			}

			if (key == 'con' || key == 'siz') {
				// calculate max hp
				v = $scope.data.player.stats_base.con.value + $scope.data.player.stats_base.siz.value;
				if (v > 0) {
					// calculate current hp if not set
					$scope.data.player.stats_calc.hp_max.value = Math.ceil(v / 2);
					if ($scope.isUndefined($scope.data.player.stats_calc.hp.value) || $scope.build.character) {
						$scope.data.player.stats_calc.hp.value = Math.ceil(v / 2);
					}
					// reduce current hp if max hp is reduced too much
					$scope.reducePointsIfHigherThanMaxValue("hp", "hp_max");
				}
			}

			if (key == 'pow') {
				// calculate max sanity
				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;

				$scope.calculateMaxSanity();

				// calculate current sanity if not set
				if ($scope.isUndefined($scope.data.player.stats_calc.san.value) || $scope.build.character) {
					$scope.data.player.stats_calc.san.value = v;
				}
				// reduce current sanity if max sanity is reduced too much
				$scope.reducePointsIfHigherThanMaxValue("san", "san_max");

				// calculate luck
				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.luck.value = v;

				//calculate max magic
				$scope.data.player.stats_calc.magic_max.value = stat.value;
				if ($scope.isUndefined($scope.data.player.stats_calc.magic.value) || $scope.build.character) {
					$scope.data.player.stats_calc.magic.value = stat.value;
				}
				// calculate current magic if not set
				if ($scope.isUndefined($scope.data.player.stats_calc.magic.value) || $scope.build.character) {
					$scope.data.player.stats_calc.magic.value = v;
				}

				// reduce current magic if max magic is reduced too much
				$scope.reducePointsIfHigherThanMaxValue("magic", "magic_max");
			}
			if (key == 'int') {
				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.idea.value = v;
			}
			if (key == 'edu') {
				v = (stat.value * 5) < 99 ? (stat.value * 5) : 99;
				$scope.data.player.stats_calc.know.value = v;
			}
			if (key == 'dex') {
				v = Math.round((stat.value * 0.3 * 100)) / 100;
				$scope.data.player.stats_calc.range.value = v + "m";
			}
		};

		function constructDamageBonus(v) {
			var dmg_dice = 1, dmg_diceType = 6, dmg_operator = "+", result = "";

			if (v >= 2 && v <= 12) {
				dmg_operator = "-";
			}
			else if (v >= 13 && v <= 16) {
				dmg_operator = "-";
				dmg_diceType = 4;
			}
			else if (v >= 17 && v <= 24) {
				dmg_dice = 0;
				dmg_diceType = 0;
			}
			else if (v >= 25 && v <= 32) {
				dmg_diceType = 4;
			}
			else if (v >= 33 && v <= 40) {
			}
			else if (v >= 41 && v <= 56) {
				dmg_dice = 2;
			}
			else if (v >= 57 && v <= 72) {
				dmg_dice = 3;
			}
			else if (v >= 73 && v <= 88) {
				dmg_dice = 4;
			}
			else if (v >= 89) {
				dmg_dice = 5;
			}

			result = dmg_operator + dmg_dice;
			if (dmg_diceType > 0) {result += 'D' + dmg_diceType;}

			$scope.constructedDamageBonus.dmg_dice = dmg_dice;
			$scope.constructedDamageBonus.dmg_diceType = dmg_diceType;
			$scope.constructedDamageBonus.dmg_operator = dmg_operator;
			$scope.constructedDamageBonus.dmg_display = result;
			return result;
		}

		function calculateAbilityValues(obj) {
			Object.keys(obj).forEach(function (key, index) {
				var length = obj[key].length;
				var stat, operator, modifier, currentStatValue;

				for (var i = 0; i <= length; i++) {
					try {
						if (typeof obj[key][i].calc !== "undefined") {
							stat = obj[key][i].calc.stat;
							operator = obj[key][i].calc.operator;
							modifier = obj[key][i].calc.modifier;

							if (typeof obj[key][i].calc.modifier === "string") {
								modifier = $scope.data.player.stats_base[modifier].value;
							}

							currentStatValue = $scope.data.player.stats_base[stat].value;

							var v = operators[operator](currentStatValue, modifier);
							obj[key][i].value_calc = v < 99 ? v : 99;
						}
						$scope.calculateSkillTotal(obj[key][i]);
					}
					catch (err) {
					}
				}
			});
		}

		$scope.calculateSkillTotal = function (ability) {
			ability.value_total = ability.value_base;
			if (!$scope.isUndefined(ability.value_added)) {
				ability.value_total += ability.value_added;
			}
			if (!$scope.isUndefined(ability.value_calc)) {
				ability.value_total += ability.value_calc;
			}
		};

		$scope.reducePointsIfHigherThanMaxValue = function (current, max) {
			if ($scope.data.player.stats_calc[current].value > $scope.data.player.stats_calc[max].value) {
				$scope.data.player.stats_calc[current].value = $scope.data.player.stats_calc[max].value;
			}
		};

		$scope.calculateMaxSanity = function () {
			for (var i = 0; i < $scope.data.abilities.common.length; i++) {
				if (!$scope.isUndefined($scope.data.abilities.common[i].cthulhu_mythos)) {
					$scope.data.player.stats_calc.san_max.value = 99 - $scope.data.abilities.common[i].value_added;

					$scope.reducePointsIfHigherThanMaxValue("san", "san_max");
					break;
				}
				else {
					$scope.data.player.stats_calc.san_max.value = 99;
				}
			}
		};

		$scope.calculateDamageRolls = function (item) {
			var damageRolls = [];

			for (var i = 0; i < item.dmg_modifier.length; i++) {
				if (item.dmg_modifier[i].toString().indexOf("dmgb") >= 0) {
					var temp = {
						"dmg_dice": 0,
						"dmg_diceType": 0,
						"dmg_operator": "",
						"dmg_modifier": [0],
						"dmg_flat": 0,
						"dmgb_multiplier": 1
					};

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

		function getFlatDamage(item) {
			var flatDamage = 0;
			for (var i = 0; i < item.dmg_modifier.length; i++) {
				if (flatDamage > 0) {break;}
				flatDamage = (typeof item.dmg_modifier[i] === "number") ? item.dmg_modifier[i] : 0;
			}
			return flatDamage;
		}

		$scope.calculateMoney = function (isDiceRoll) {
			var roll = getRandomInt(0, 9);
			var income = 0;
			var chart = {
				"1890" : [500,1000,1500,2000,2500,3000,4000,5000,5000,10000],
				"1920" : [1500,2500,3500,3500,4500,5500,6500,7500,10000,20000],
				"modern" : [15000,25000,35000,45000,55000,75000,100000,200000,300000,500000]
			};

			if (!isDiceRoll) {
				$scope.data.player.income.y_income = chart[$scope.data.player.income.era][$scope.data.player.income.roll];
			}
			else {
				$scope.data.player.income.roll = roll;
				$scope.data.player.income.y_income =
					chart[$scope.data.player.income.era][roll];
			}

			$scope.data.player.income.total_assets.value_base = $scope.data.player.income.y_income * 5;
			$scope.data.player.income.cash.value_base = $scope.data.player.income.total_assets.value_base / 10;
			$scope.data.player.income.stocks.value_base = $scope.data.player.income.total_assets.value_base / 10;
			$scope.data.player.income.assets.value_base =
				$scope.data.player.income.total_assets.value_base * 0.8;
		};
		$scope.$watch('data.player.income', function(newVal, oldVal){
			newVal.cash.value_total = newVal.cash.value_base + newVal.cash.value_added;
			newVal.stocks.value_total = newVal.stocks.value_base + newVal.stocks.value_added;
			newVal.assets.value_total = newVal.assets.value_base + newVal.assets.value_added;

			newVal.total_assets.value_added = newVal.cash.value_added + newVal.stocks.value_added + newVal.assets.value_added;
			newVal.total_assets.value_total = newVal.total_assets.value_base + newVal.total_assets.value_added;


		}, true);

		// Get player status (hp, magic, sanity)
		$scope.getStatus = function (stat, minValue, value) {
			var status = '';

			if (stat == 'magic') {
				status = (value >= minValue && value < 1) ? 'unconscious' : 'normal';
			}
			else if (stat == 'hitpoints') {
				if (value >= (minValue + 1) && value < 1) {
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
		$scope.validTimePeriod = function (time, mod, selectValue) {
			mod = (mod == "not") ? false : true;

			if (typeof time === "undefined") {return true;}
			else if (time === "anytime") {return true;}
			else if (selectValue == "anytime" || negateMaybe(time == selectValue, mod)) {return true;}
			else {return false;}
		};

		$scope.changeLanguage = function () {
			if ($scope.data.options.languageSelect.value == "English") {
				$scope.data.options.languageIndex = 0;
				$scope.predicate = 'name[0]';
			}
			else if ($scope.data.options.languageSelect.value == "Deutsch") {
				$scope.data.options.languageIndex = 1;
				$scope.predicate = 'name[1]';
			}
		};

		$scope.addCustomAbility = function () {
			var obj = {
				"name": [],
				"value_added": 0,
				"value_total": 0,
				"skilled": false,
				"custom_name": ""
			};

			$scope.data.abilities.custom.push(obj);
		};

		$scope.removeCustomAbility = function () {
			for (var i = 0; i < $scope.data.abilities.custom.length; i++) {
				console.log($scope.data.abilities.custom[i].custom_name);
				if ($scope.data.abilities.custom[i].custom_name === "") {
					$scope.data.abilities.custom.splice(i, 1);
				}
			}
		};

		$scope.handleSkillChanges = function (ability) {
			$scope.calculateMaxSanity();
			$scope.checkAvailableSkillPoints();
			$scope.calculateSkillTotal(ability);
		};

		$scope.checkAvailableSkillPoints = function () {
			var obj = $scope.data.abilities;
			var v = 0;

			Object.keys($scope.data.abilities).forEach(function (key, index) {
				for (var i = 0; i < obj[key].length; i++) {
					if (!$scope.isUndefined(obj[key][i].value_added)) {
						v += obj[key][i].value_added;
					}
				}
			});
			$scope.data.player.skillPoints_used = v;
		};

		$scope.playerHasArmour = function () {
			var v = 0;
			try {
				for (var i = 0; i < $scope.data.player.items.armour.length; i++) {
					v += $scope.data.player.items.armour[i].value;
				}
				$scope.armourRating = v;
			}
			catch (err) {
			}

			return ( v > 0 );
		};

		$scope.getWeaponSubTypeSkillChance = function (item) {
			var type = item.sub_type;
			var obj = $scope.data.abilities;
			var v = 0;

			Object.keys($scope.data.abilities).forEach(function (key, index) {
				for (var i = 0; i < obj[key].length; i++) {
					if (key != "custom") {
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
		$scope.synchSuccessStates = function (state, type, triggeredBySkill) {
			if (typeof type === "undefined" || type == "armour") {return;}
			var obj = $scope.data.abilities;
			var items = $scope.data.player.items.equipped;
			var group = [];
			var v = 0;
			var j = 0;

			Object.keys(items).forEach(function (key, index) {
				for (var i = 0; i < items[key].length; i++) {
					if (items[key][i].sub_type == type) {
						group.push(items[key][i]);
					}
				}
			});

			Object.keys(obj).forEach(function (key, index) {
				for (var i = 0; i < obj[key].length; i++) {
					if (key != "custom") {
						var skillName = obj[key][i].sub_type;
						if (skillName == type) {
							if (obj[key][i].success) {
								for (j = 0; j < group.length; j++) {
									group[j].success = obj[key][i].success;
								}
							}
							if (!triggeredBySkill && state) {
								for (j = 0; j < group.length; j++) {
									group[j].success = true;
								}
								obj[key][i].success = true;
							}
							if (triggeredBySkill) {
								for (j = 0; j < group.length; j++) {
									group[j].success = obj[key][i].success;
								}
							}
						}
					}
				}
			});
		};

		$scope.selectItemGroup = function () {
			var select = $scope.data.options.itemSelect;
			var index = select.options.indexOf(select.value);
			var key = select.types[index];
			var obj = {};
			obj[key] = $scope.data.player.items.available[key];
			$scope.selectedItemList = obj;
		};

		$scope.resetItemSelect = function () {
			$scope.data.options.itemSelect.value = "";
			$scope.selectedItemListTime = "anytime";
			$scope.showRemovable = true;
		};

		$scope.hasRemovables = function (list) {
			var l = list.length;

			for (var i = 0; i < l; i++) {
				if (!$scope.isUndefined(list[i].removable)) {
					if (!list[i].removable) {return false;}
				}
			}

			return l !== 0;
		};

		$scope.addNewItems = function () {
			var items = $scope.data.player.items.available;
			Object.keys(items).forEach(function (key, index) {
				for (var i = 0; i < items[key].length; i++) {
					if (items[key][i].remove) {
						$scope.data.player.items.equipped[key].push(items[key][i]);
						items[key][i].remove = false;
					}
				}
			});
		};

		$scope.removeItems = function () {
			var items = $scope.data.player.items.equipped;
			Object.keys(items).forEach(function (key, index) {
				for (var i = 0; i < items[key].length; i++) {
					if (items[key][i].remove) {
						$scope.data.player.items.equipped[key].splice(i, 1);
					}
				}
			});
		};

		$scope.rollDice = function (ability, type, reroll) {
			var rollResult = getRandomInt(1, 100);
			$scope.diceRollResult = {
				"rollType": "", "rollTypeText": "", "chance": 0, "roll": 0, "diceType": 0, "name": "",
				"resultText": "", "dmg": 0, "success": false, "ability": ability, "canRollDamage" : false, "weapon" :{},
				"isCrit" : false
			};

			if (!$scope.isUndefined(ability.equip)) {
				$scope.diceRollResult.canRollDamage = true;
				$scope.diceRollResult.weapon = ability;
				//console.log(ability);
				//console.log($scope.constructedDamageBonus);
			}

			$scope.fireFromCoreRange = reroll;
			var weaponType = ability.sub_type;
			if (!$scope.isUndefined(weaponType)) {
				switch (weaponType) {
					case "shotgun": $scope.fireFromCoreRange = reroll; break;
					case "rifle": $scope.fireFromCoreRange = reroll; break;
					case "handgun": $scope.fireFromCoreRange = reroll; break;
					case "machinegun": $scope.fireFromCoreRange = reroll; break;
					case "submachinegun": $scope.fireFromCoreRange = reroll; break;
					case "throw": $scope.fireFromCoreRange = reroll; break;
					default : $scope.fireFromCoreRange = false;
				}
			}

			//console.group('Rolling Dice...');
			//console.group(ability.value_base);
			if (type == 'skillCheck') {

				if (!$scope.isUndefined(ability.sub_type)) {
					if (ability.sub_type == 'melee') {
						$scope.diceRollResult.chance = ability.value_base;
					}
					else {
						var obj = $scope.data.abilities;
						Object.keys(obj).forEach(function (key, index) {
							for (var i = 0; i < obj[key].length; i++) {
								if (obj[key][i].sub_type == ability.sub_type) {
									ability = obj[key][i];
									break;
								}
							}
						});
						$scope.diceRollResult.chance = ability.value_total;
					}
				}
				else {
					$scope.diceRollResult.chance = ability.value_total;
				}

				if ($scope.fireFromCoreRange) {
					$scope.diceRollResult.chance = $scope.diceRollResult.chance * 2;
					if($scope.diceRollResult.chance >= 99) {
						$scope.diceRollResult.chance = 99
					}
				}

				//console.log('Skill-Check: ', ability.name[0], ' ', $scope.diceRollResult.chance, '% Chance');
				$scope.diceRollResult.rollTypeText = "Skill-Check";
				$scope.diceRollResult.rollType = "skillCheck";
				$scope.diceRollResult.name = ability.name[$scope.data.options.languageIndex];
				$scope.diceRollResult.roll = rollResult;

				//console.log('Rolled ', rollResult, ' against ', $scope.diceRollResult.chance);
				if (rollResult > $scope.diceRollResult.chance) {
					if (rollResult >= 96) {
						//console.log('Critical Fail (Roll >= 96).');
						$scope.diceRollResult.resultText = 'Critical Fail (Roll >= 96).';
					}
					else {
						//console.log('Fail.');
						$scope.diceRollResult.resultText = 'Fail.';
					}
				}
				else {
					if (rollResult == 1) {
						//console.log('Critical Success (Roll == 1).');
						$scope.diceRollResult.resultText = 'Critical Success (Roll == 1).';
						$scope.diceRollResult.isCrit = true;
					}
					else if (rollResult <= ( Math.ceil($scope.diceRollResult.chance * 0.20))) {
						//console.log('Extreme Success (Roll <= 1/5 of Ability).');
						$scope.diceRollResult.resultText = 'Extreme Success (Roll <= 1/5 of Ability).';
						$scope.diceRollResult.isCrit = true;
					}
					else if (rollResult <= ( Math.ceil($scope.diceRollResult.chance * 0.5))) {
						//console.log('Difficult Success (Roll <= 1/2 of Ability).');
						$scope.diceRollResult.resultText = 'Difficult Success (Roll <= 1/2 of Ability).';
					}
					else {
						//console.log('Success.');
						$scope.diceRollResult.resultText = 'Success.';
					}
					ability.success = true;
					$scope.diceRollResult.success = true;
				}
			}

			if ($scope.diceRollResult.canRollDamage && !$scope.isUndefined($scope.diceRollResult.weapon.malfunction)){
				if($scope.diceRollResult.weapon.malfunction <= $scope.diceRollResult.roll){
					$scope.diceRollResult.weapon.hasMalfunction = true;
				}
			}

			//console.groupEnd();
		};

		$scope.rollCustomDice = function (count, type) {
			var results = [];
			$scope.tempDiceResults = [];

			for (var i = 0; i <= count; i++) {
				results.push(getRandomInt(1, type));
			}
			$scope.tempDiceResults = results;
		};

		/* Load JSON */
		function loadJSON(url) {
			$http.get(url)
				.then(function (res) {
					$scope.data = res.data;
					initCalculations();
				});
		}

		function initCalculations() {
			Object.keys($scope.data.player.stats_base).forEach(function (key, index) {
				$scope.calculateDependencies(key, $scope.data.player.stats_base[key]);
			});
		}
		$scope.$watch('data.player.stats_base', function(newVal, oldVal){
			if($scope.data.options.buildingCharacter) {
				initCalculations();
			}
		}, true);

		$scope.uploadFiles = function(file, errFiles) {
			$scope.f = file;
			$scope.errFile = errFiles && errFiles[0];
			if (file) {
				var upload = Upload.dataUrl(file, false).then(function(url){
					$http.get(url).success (function(data) {
						$scope.data = data;
					});
				});
			}
		};

		$scope.resetCharacter = function() {
			var url = $location.host() + '/assets/json/data.json';

			$http.get(url).success (function(data) {
				$scope.data = data;
			});
		};

		/* Save data */
		$scope.saveDataToJSON = function (data, filename) {
			if (!data) {
				console.error('No data');
				return;
			}

			if (!filename) {
				filename = 'character';
			}

			filename = filename.toLowerCase().replace(/ /g, '_');
			filename = filename.replace(/\W/g, '')+ '.json';

			if (typeof data === 'object') {
				data = JSON.stringify(data, undefined, 2);
			}

			var blob = new Blob([data], {type: 'text/json'}),
				e = document.createEvent('MouseEvents'),
				a = document.createElement('a');

			a.download = filename;
			a.href = window.URL.createObjectURL(blob);
			a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
			e.initEvent('click', true, false, window,
				0, 0, 0, 0, 0, false, false, false, false, 0, null);
			a.dispatchEvent(e);
		};

		function loadData() {
			var d =	getLocalStorage('data');
			if (!isEmpty(d)) {
				$scope.data = d;
			}
			else {
				loadJSON('./assets/json/data.json');
			}
			//dev
			loadJSON('./assets/json/data.json');
		}

		$scope.$watch('buildingCharacter', function(newVal, oldVal){
			$scope.data.options.buildingCharacter = $scope.build.character;
		}, true);

		// write data to localStorage on changes
		$scope.$watch('data', function(newVal, oldVal){
			setLocalStorage('data', $scope.data);
		}, true);

		function setLocalStorage(key, val) {
			return localStorageService.set(key, val);
		}
		function getLocalStorage(key) {
			return localStorageService.get(key);
		}

		/* Helpers */
		$scope.isUndefined = function (e) {
			return typeof e === 'undefined';
		};
		$scope.isEmpty = function (e) {
			return e.length;
		};

		function isEmpty (obj) {
			if (obj == null) return true;

			// Assume if it has a length property with a non-zero value
			// that that property is correct.
			if (obj.length > 0)    return false;
			if (obj.length === 0)  return true;

			// Otherwise, does it have any properties of its own?
			// Note that this doesn't handle
			// toString and valueOf enumeration bugs in IE < 9
			for (var key in obj) {
				if (hasOwnProperty.call(obj, key)) return false;
			}
		}

		$scope.calculateColspan = function (showValueBase) {
			var count = 0;
			if (showValueBase) {
				count++;
			}
			return count;
		};

		$scope.range = function (count, added, offset) {
			var range = [];
			for (var i = offset; i < (count + added); i++) {
				range.push(i);
			}
			return range;
		};

		$scope.isMaxStatValue = function (key) {
			return key.indexOf('_max') < 1;
		};

		$scope.isVariableStat = function (key) {
			switch (key) {
				case "hp" :
					return true;
				case "san" :
					return true;
				case "magic" :
					return true;
			}
		};

		function negateMaybe(v, check) {
			return check ? v : !v;
		}

		function getRandomInt(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}
	}]);

	/* Filters */
	appModule.filter("max99", [function () {
		return function (v) {
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
	appModule.directive('info', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/info.html',
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
	appModule.directive('weapontable', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/weaponTable.html',
			scope: true,
			replace: true
		};
	});
	appModule.directive('weapontableavailable', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/weaponTableAvailable.html',
			scope: true,
			replace: true
		};
	});
	appModule.directive('armourtable', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/armourtable.html',
			scope: true,
			replace: true
		};
	});
	appModule.directive('armourtableremove', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/armourtableremove.html',
			scope: true,
			replace: true
		};
	});
})();
