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
const black  = 0;
const brown  = 1;
const red    = 2;
const orange = 3;
const yellow = 4;
const green  = 5;
const blue   = 6;
const violet = 7;
const grey   = 8;
const white  = 9;
const gold   = -1; // x0.1  Ohm
const silver = -2; // x0.01 Ohm

exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.api_v1 = functions.https.onRequest((request, response) => {
	const Agent = new App({request, response});
	let actionMap = new Map();
	actionMap.set(DECODE, decode);
	actionMap.set(ENCODE, encode);

	function decode(app) {
		console.log(request);
		console.log(app.data);
		var obj = colorToResistance('red', 'red', 'red', 'green', 'brown');
		app.tell('That is a ' + obj.display_impedance + ' Ohm resistor with a ' + obj.tolerance + ' percent tolerance');
	}

	function colorToResistance(color1, color2, color3, multiplier, tolerance) {		
		var impedance = 0;
		impedance += colorToNum(color1.toLowerCase()) * 100;
		impedance += colorToNum(color2.toLowerCase()) * 10;
		if (color3 != undefined) {
			impedance += colortoNum(color3.toLowerCase());
		} else {
			impedance = impedance / 10; // Shift down b/c 2 params
		}
		impedance = impedance * Math.pow(10, colorToNum(multiplier));
		return {impedance: impedance, tolerance: tolerance, display_impedance: impedance};
	}

	function colorToNum(color) {
		if (color == "black") {
			return black;
		} else if (color == "brown") {
			return brown;
		} else if (color == "red") {
			return red;
		} else if (color == "orange") {
			return orange;
		} else if (color == "yellow") {
			return yellow;
		} else if (color == "green") {
			return green;
		} else if (color == "blue") {
			return blue;
		} else if (color == "violet") {
			return violet;
		} else if (color == "grey") {
			return grey;
		} else if (color == "white") {
			return white;
		} else if (color == "gold") {
			return gold;
		} else if (color == "silver") {
			return silver;
		}
		return 0;
	}

//	function numToColor(

	function encode(app) {
		console.log(app.data);
		app.tell('The colors of that resistor are red, blue, and white');
	}
	Agent.handleRequest(actionMap);
});

