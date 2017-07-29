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
		var toleranceP = colorToNum(tolerance);
		// FUTURE: Create a "display_impedance" which uses SI prefixes
		return {impedance: impedance, tolerance: tolerance, display_impedance: impedance};
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
		app.tell('The colors of that resistor are red, blue, and white');
	}
	Agent.handleRequest(actionMap);
});

