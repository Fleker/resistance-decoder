/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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
 * The Resistance agent for Google Assistant
 */

'use strict';

process.env.DEBUG = 'actions-on-google:*';
const App = require('actions-on-google').ApiAiApp;
const functions = require('firebase-functions');
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase);

const DEBUG_LOGS = false;
const VERSION_NUMBER = '1.1.0';
const RESISTOR_IMAGE_ENDPOINT = 'https://us-central1-newagent-ecf2d.cloudfunctions.net/resistor_image';

// Actions
const DECODE = 'decode';
const ENCODE = 'encode';

// Define constants. This is their digit value, either alone or 10^x.
// Source: https://www.digikey.com/-/media/Images/Marketing/Resources/Calculators/resistor-color-chart.jpg?la=en-US&ts=72364a89-2139-476a-8a54-8d78dacd29ff
const colorMap = [
	{color: 'black', 	value:	0,	hex: '#263238'},
	{color: 'brown',	value:  1,	hex: '#795548'},
	{color: 'red',		value: 	2,	hex: '#f44336'},
	{color: 'orange',	value:  3,	hex: '#FF9800'},
	{color: 'yellow',	value:  4,	hex: '#FFEB3B'},
	{color: 'green',	value:  5,	hex: '#4CAF50'},
	{color: 'blue', 	value: 	6,	hex: '#2196F3'},
	{color: 'violet',	value:  7,	hex: '#9C27B0'},
	{color: 'grey',		value:	8,	hex: '#9E9E9E'},
	{color: 'white',	value:	9,	hex: '#FAFAFA'},
	{color: 'gold',		value: -1,	hex: '#FFC107'}, // x0.1  Ohm
	{color: 'silver',	value: -2,	hex: '#607D8B'}  // x0.01 Ohm
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
	'mega': 1000000,
	'giga': 1000000000,
};

exports.privacy = functions.https.onRequest((request, response) => {
	response.send("<h1>About Resistor Decoder</h1><p>Resistor Decoder gives users a hands-free way to figure out what resistors they have and what they need. " +
		"Each request is sent anonymously and queries are not shared with any third-parties.</p>");
});

exports.api_v1 = functions.https.onRequest((request, response) => {
	const Agent = new App({request, response});
	let actionMap = new Map();
	actionMap.set(DECODE, decode);
	actionMap.set(ENCODE, encode);
	
	console.log('Running version', VERSION_NUMBER);
	
	function decode(app) {
		var c0 = app.getArgument('Color');
		var c1 = app.getArgument('Color1');
		var c2 = app.getArgument('Color2');
		var c3 = app.getArgument('Color3');
		var c4 = app.getArgument('Color4');
		var colorsString = c0 + ',' + c1 + ',' + c2;
		if (DEBUG_LOGS) {
			console.log('Received colors', c0, c1, c2, c3, c4);
		}
		
		var obj;
		if (c3 == undefined) {
			// Three colors
			obj = colorToResistance(c0, c1, undefined, c2, undefined);
		} else if (c4 == undefined) {
			// Four colors
			obj = colorToResistance(c0, c1, undefined, c2, c3);
			colorsString += ',' + c3;
		} else {
			// Five colors
			obj = colorToResistance(c0, c1, c2, c3, c4);
			colorsString += ',' + c4;
		}
		var verbalResponse = '';
		if (obj.tolerance == undefined) {
			verbalResponse = 'That is a ' + obj.display_impedance + ' Ohm resistor';		
		} else {
			verbalResponse = 'That is a ' + obj.display_impedance + ' Ohm resistor with a ' + obj.tolerance + ' percent tolerance';
		}
		app.tell(app.buildRichResponse()
			.addSimpleResponse(verbalResponse)
			.addBasicCard(app.buildBasicCard(obj.display_impedance + 'Ω')
				.setImage(RESISTOR_IMAGE_ENDPOINT + '?colors=' + colorsString, obj.display_impedance + 'Ω')
			)
		);
	}

	function colorToResistance(color1, color2, color3, multiplier, tolerance) {		
		var impedance = 0;
		if (DEBUG_LOGS) {
			console.log("i:", impedance);
		}
		impedance += colorToNum(color1.toLowerCase()) * 100;
		if (DEBUG_LOGS) {
			console.log("i:", impedance);
		}
		impedance += colorToNum(color2.toLowerCase()) * 10;
		if (DEBUG_LOGS) {
			console.log("i:", impedance);
		}
		if (color3 != undefined) {
			impedance += colorToNum(color3.toLowerCase());
		} else {
			impedance = impedance / 10; // Shift down b/c 2 params
		}
		if (DEBUG_LOGS) {
			console.log("i:", impedance);
		}
		impedance = impedance * Math.pow(10, colorToNum(multiplier.toLowerCase()));
		if (DEBUG_LOGS) {
			console.log("i:", impedance);
		}
		var toleranceP = undefined;
		if (tolerance != undefined) {
			toleranceP = colorToTolerance(tolerance.toLowerCase());			
		}
		var display = impedance;
		if (impedance > 1000000) {
			display = impedance / 1000000 + ' Mega';
		} else if (impedance > 1000) {
			display = impedance / 1000 + ' Kilo';
		}
		// FUTURE: Create a "display_impedance" which uses SI prefixes
		return {impedance: impedance, tolerance: toleranceP, display_impedance: display};
	}

	function colorToNum(color) {
		for (var i in colorMap) {
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
		var number = app.getArgument('number');
		var units = app.getArgument('unit-length');
		if (units != undefined && unitsMap[units] != undefined) {
			units = units.toLowerCase();
			number = number * unitsMap[units];
		}
		var obj = resistanceToColors(number, app.getArgument('resistor-type'));
		var output = 'A ' + app.getArgument('number');
		if (units != undefined && unitsMap[units] != undefined) {
			output += ' ' + units;
		} 
		output += ' Ohm resistor has the colors ' + obj.color1 + ', ' + obj.color2 + ', ';
		var colorsString = obj.color1 + ',' + obj.color2 + ',' + obj.color3;
		if (obj.color4) {
			output += obj.color3 + ', and ' + obj.color4;
			colorsString += ',' + obj.color4;
		} else {
			output += 'and ' + obj.color3;
		}

		var caption = app.getArgument('number') + 'Ω';
		if (units != undefined && unitsMap[units] != undefined) {
			caption = app.getArgument('number') + ' ' + units + 'Ω';
		}
		app.tell(app.buildRichResponse()
			.addSimpleResponse(output)
			.addBasicCard(app.buildBasicCard(caption)
				.setImage(RESISTOR_IMAGE_ENDPOINT + '?colors=' + colorsString, caption)
			)
		);
	}

	function resistanceToColors(number, resistorType) {
		// First, obtain the magnitude.
		var magnitude = Math.floor(Math.log10(number));
		// In a 5-strip resistor, the magnitude is slightly smaller
		var c4 = undefined;
		if (resistorType == '5-strip') {
			c4 = numToColor(magnitude - 2); // all magnitudes are shifted down 100
		} else {
			var c3 = numToColor(magnitude - 1); // all magnitudes are shifted down 10
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
		return {color1: c1, color2: c2, color3: c3, color4: c4, magnitude: magnitude, leadingDigit: leadingDigit, secondaryDigit: secondaryDigit, tertiaryDigit: tertiaryDigit};
	}

	Agent.handleRequest(actionMap);
});

/*
 * This function allows the server to dynamically generate resistor images to display to the user
 * params: ?colors={comma-separated list of colors} - Must be between 3 and 5 inclusive.
 *
 * Examples: ?colors=red,blue,yellow
 * 	     ?colors=red,blue,yellow,silver
 *           ?colors=red,blue,yellow,blue,silver
 */
exports.resistor_image = functions.https.onRequest((request, response) => {
	function colorToHex(color) {
		for (var i in colorMap) {
			if (colorMap[i].color == color) {
				return colorMap[i].hex;
			}
		}
		return undefined;
	}
	
	const colorsString = request.query.colors;
	if (colorsString == undefined || colorsString.length == 0) {
		// Invalid parameter
		response.status(400).send('Bad Request - Requires `colors` GET parameter');
		return;
	}
	const colors = colorsString.toLowerCase().split(','); 
	if (colors.length < 3 || colors.length > 5) {
		// Validate number of colors
		response.status(400).send('Bad Request - `colors` list must have between 3 and 5 colors inclusive');
		return;
	}
	// Generate a canvas
	const Canvas = require('canvas-prebuilt');
	const canvas = new Canvas(400, 320);
	const ctx = canvas.getContext('2d');
	// Generate the resistor base img
	ctx.beginPath();
	ctx.fillStyle = '#A1887F';
	ctx.rect(30, 40, 340, 120);
	ctx.fill();

	ctx.beginPath();
	ctx.strokeStyle = '#333';
	ctx.lineWidth = 6;
	ctx.moveTo(33, 159);
	ctx.lineTo(33, 320);
	ctx.stroke();

	ctx.beginPath();
	ctx.strokeStyle = '#333';
	ctx.lineWidth = 6;
	ctx.moveTo(367, 159);
	ctx.lineTo(367, 320);
	ctx.stroke();
	// For each color, add a stripe
	for (var i = 0; i < colors.length; i++) {
		if (colorToHex(colors[i]) === undefined) {
			response.status(400).send('Bad Request - Color ' + colorMap[colors[i]] + ' not found');
			return;
		}
		var stripeColor = colorToHex(colors[i]);
		ctx.beginPath();
		ctx.fillStyle = stripeColor;
		if (colors.length - i == 1) {
			ctx.rect(70 + 60 * i, 40, 40, 120);
		} else {
			ctx.rect(50 + 60 * i, 40, 40, 120);
		}
		ctx.fill();
	}
	// Throw error if a color is undefined
	// Return color
	response.set('Cache-Control', 'public, max-age=60, s-maxage=31536000');
	response.writeHead(200, {'Content-Type': 'image/png'});
	canvas.pngStream().pipe(response);
});
