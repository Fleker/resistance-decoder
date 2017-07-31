/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The Actions on Google client library.
 * https://developers.google.com/actions/
 */

'use strict';

process.env.DEBUG = 'actions-on-google:*';
const App = require('actions-on-google').ApiAiApp;
const functions = require('firebase-functions');
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase);

// Actions
const DECODE = 'decode';
const ENCODE = 'encode';

// Define constants. This is 10^x because of the way they're setup.
// Source: https://www.digikey.com/-/media/Images/Marketing/Resources/Calculators/resistor-color-chart.jpg?la=en-US&ts=72364a89-2139-476a-8a54-8d78dacd29ff
const colorMap = [
	{color: 'black', 	value:	0},
	{color: 'brown',	value:  1},
	{color: 'red',		value: 	2},
	{color: 'orange',	value:  3},
	{color: 'yellow',	value:  4},
	{color: 'green',	value:  5},
	{color: 'blue', 	value: 	6},
	{color: 'violet',	value:  7},
	{color: 'grey',		value:	8},
	{color: 'white',	value:	9},
	{color: 'gold',		value: -1}, // x0.1  Ohm
	{color: 'silver',	value: -2}  // x0.01 Ohm
];

const toleranceMap = [
	{color: 'black', 	value:	0}, // N/A
	{color: 'brown',	value:  1},
	{color: 'red',		value: 	2},
	{color: 'orange',	value:  0}, // N/A
	{color: 'yellow',	value:  5}, // Copy gold
	{color: 'green',	value:  0.5},
	{color: 'blue', 	value: 	0.25},
	{color: 'violet',	value:  0.1},
	{color: 'grey',		value:	0.05},
	{color: 'white',	value:	0}, // N/A
	{color: 'gold',		value: 5},
	{color: 'silver',	value: 10}
];

const unitsMap = {
	'kilo': 1000,
	'k': 	1000,
	'mega': 1000000,
	'm':	1000000,
	'giga': 1000000000,
	'g':	1000000000
};

exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.api_v1 = functions.https.onRequest((request, response) => {
	const Agent = new App({request, response});
	let actionMap = new Map();
	actionMap.set(DECODE, decode);
	actionMap.set(ENCODE, encode);

	function decode(app) {
		var params = request.body.result.parameters;
		console.log(params);
		console.log(colorMap);
		var c0 = params.Color;
		var c1 = params.Color1;
		var c2 = params.Color2;
		var c3 = (params.Color3 != 'null' && params.Color3.length > 0) ? params.Color3 : undefined;
		var c4 = (params.Color4 != 'null' && params.Color4.length > 0) ? params.Color4 : undefined;
		
		var obj;
		if (c3 == undefined) {
			// Three colors
			obj = colorToResistance(c0, c1, undefined, c2, undefined);
		} else if (c4 == undefined) {
			// Four colors
			obj = colorToResistance(c0, c1, undefined, c2, c3);
		} else {
			// Five colors
			obj = colorToResistance(c0, c1, c2, c3, c4);
		}
		if (obj.tolerance == undefined) {
			app.tell('That is a ' + obj.display_impedance + ' Ohm resistor');		
		} else {
			app.tell('That is a ' + obj.display_impedance + ' Ohm resistor with a ' + obj.tolerance + ' percent tolerance');
		}
	}

	function colorToResistance(color1, color2, color3, multiplier, tolerance) {		
		var impedance = 0;
		console.log("i:", impedance);
		impedance += colorToNum(color1.toLowerCase()) * 100;
		console.log("i:", impedance);
		impedance += colorToNum(color2.toLowerCase()) * 10;
		console.log("i:", impedance);
		if (color3 != undefined) {
			impedance += colorToNum(color3.toLowerCase());
		} else {
			impedance = impedance / 10; // Shift down b/c 2 params
		}
		console.log("i:", impedance);
		impedance = impedance * Math.pow(10, colorToNum(multiplier.toLowerCase()));
		console.log("i:", impedance);
		var toleranceP = colorToTolerance(tolerance);
		// FUTURE: Create a "display_impedance" which uses SI prefixes
		return {impedance: impedance, tolerance: toleranceP, display_impedance: impedance};
	}

	function colorToNum(color) {
		for (var i in colorMap) {
			console.log("Checking", color, i, colorMap[i].color);
			if (colorMap[i].color == color) {
				return colorMap[i].value;
			}
		}
		return 0;
	}

	function colorToTolerance(color) {
		for (var i in toleranceMap) {
			if (toleranceMap[i].color == color) {
				return toleranceMap[i].value;
			}
		}
		return 0;
	}

	function numToColor(num) {
		for (var i in colorMap) {
			if (colorMap[i].value == num) {
				return colorMap[i].color;
			}
		}
		return "unknown";
	}

	function encode(app) {
		var params = request.body.result.parameters;
		var number = params.number;
		var units = params['unit-length'];
		if (units != undefined && unitsMap[units] != undefined) {
			number = number * unitsMap[units];
		}
		var obj = resistanceToColors(number, params['resistor-type']);
		var output = 'A ' + number;
		if (units != undefined && unitsMap[units] != undefined) {
			output += ' ' + units;
		} 
		output += ' resistor has the colors ' + obj.color1 + ', ' + obj.color2 + ', ';
		if (obj.color4) {
			output += obj.color3 + ', and ' + obj.color4;
		} else {
			output += 'and ' + obj.color3;
		}
		app.tell(output);
	}

	function resistanceToColors(number, resistorType) {
		// First, obtain the magnitude.
		var magnitude = Math.floor(Math.log10(number));
		// In a 5-strip resistor, the magnitude is slightly smaller
		var c4 = undefined;
		if (resistorType == '5-strip') {
			magnitude--;
			c4 = numToColor(magnitude);
		} else {
			var c3 = numToColor(magnitude);
		}

		// Next, obtain the leading digit.
		var leadingDigit = Math.floor(number / Math.pow(10, magnitude));
		var c1 = numToColor(leadingDigit);
		
		// Next, obtain the second digit.
		var secondaryDigit = Math.floor(number / Math.pow(10, magnitude - 1)) - leadingDigit * 10;
		var c2 = numToColor(secondaryDigit);

		if (resistorType == '5-strip') {
			// Obtain the tertiary digit.
			var tertiaryDigit = Math.floor(number / Math.pow(10, magnitude - 2)) - leadingDigit * 100 - secondaryDigit * 10;
			var c3 = numToColor(tertiaryDigit);
		}
		return {color1: c1, color2: c2, color3: c3, color4: c4};
	}

	Agent.handleRequest(actionMap);
});

