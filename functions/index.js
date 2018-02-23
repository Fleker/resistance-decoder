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
const admin = require('firebase-admin');
const { Resistor, HexValues } = require('./resistor');
admin.initializeApp(functions.config().firebase);

const DEBUG_LOGS = false;
const VERSION_NUMBER = '1.1.1';

// Actions
const DECODE = 'decode';
const ENCODE = 'encode';

exports.privacy = functions.https.onRequest((request, response) => {
  response.send('<h1>About Resistor Decoder</h1><p>Resistor Decoder gives users a hands-free way to figure out what resistors they have and what they need. ' +
        'Each request is sent anonymously and queries are not shared with any third-parties.</p>');
});

exports.api_v1 = functions.https.onRequest((request, response) => {
  const Agent = new App({request, response});
  let actionMap = new Map();
  actionMap.set(DECODE, decode);
  actionMap.set(ENCODE, encode);

  console.log('Running version', VERSION_NUMBER);

  function decode (app) {
    const c0 = app.getArgument('Color');
    const c1 = app.getArgument('Color1');
    const c2 = app.getArgument('Color2');
    const c3 = app.getArgument('Color3');
    const c4 = app.getArgument('Color4');
    if (DEBUG_LOGS) {
      console.log('Received colors', c0, c1, c2, c3, c4);
    }

    let resistor = new Resistor();
    resistor.fromColorNames(c0, c1, c2, c3, c4);

    var verbalResponse = '';
    if (resistor.tolerance === undefined) {
      verbalResponse = `That is a ${resistor.displayImpedance} Ohm resistor`;
    } else {
      verbalResponse = `That is a ${resistor.displayImpedance} Ohm resistor with a ` +
                    `${resistor.tolerance} percent tolerance`;
    }
    app.tell(app.buildRichResponse()
                .addSimpleResponse(verbalResponse)
                .addBasicCard(app.buildBasicCard(resistor.displayImpedance + 'Ω')
                    .setImage(resistor.imageUrl, resistor.displayImpedance + 'Ω')
                )
            );
  }

  function encode (app) {
    const number = app.getArgument('number');
    const units = app.getArgument('unit-length');
    const type = app.getArgument('resistor-type');

    let resistor = new Resistor();
    resistor.fromNumericalParameters(number, units, type);

    app.tell(app.buildRichResponse()
            .addSimpleResponse(resistor.displayColors)
            .addBasicCard(app.buildBasicCard(resistor.displayImpedance + 'Ω')
                .setImage(resistor.imageUrl, resistor.displayImpedance + 'Ω')
            )
        );
  }

  Agent.handleRequest(actionMap);
});

/**
 * This function allows the server to dynamically generate resistor images to display to the user
 * params: ?colors={comma-separated list of colors} - Must be between 3 and 5 inclusive.
 *
 * Examples: ?colors=red,blue,yellow
 *           ?colors=red,blue,yellow,silver
 *           ?colors=red,blue,yellow,blue,silver
 */
exports.resistor_image = functions.https.onRequest((request, response) => {
  const colorsString = request.query.colors.toUpperCase();
  if (colorsString === undefined || colorsString.length === 0) {
       // Invalid parameter
    response.status(400).send('Bad Request - Requires `colors` GET parameter');
    return;
  }
  const colors = colorsString.split(',');
  if (colors.length < 3 || colors.length > 5) {
        // Validate number of colors
    response.status(400).send('Bad Request - `colors` list must have between 3 and 5 colors inclusive');
    return;
  }
    // Generate a canvas
  const Canvas = require('canvas-prebuilt');
  const canvas = new Canvas(800, 396);
  const ctx = canvas.getContext('2d');
    // Generate a background if valid
  if (request.query.background) {
    ctx.beginPath();
    ctx.fillStyle = '#efefef';
    ctx.rect(0, 0, 800, 396);
    ctx.fill();
  }
    // Generate the resistor base img
  ctx.beginPath();
  ctx.fillStyle = '#A1887F';
  ctx.rect(60, 40, 680, 200);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 12;
  ctx.moveTo(66, 239);
  ctx.lineTo(66, 396);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 12;
  ctx.moveTo(734, 239);
  ctx.lineTo(734, 396);
  ctx.stroke();
    // For each color, add a stripe
  for (var i = 0; i < colors.length; i++) {
    let stripeColor = HexValues[colors[i]];
    if (stripeColor === undefined) {
      response.status(400).send(`Bad Request - Color ${colors[i]} not found`);
      return;
    }
    ctx.beginPath();
    ctx.fillStyle = stripeColor;
    if (colors.length - i === 1) {
      ctx.rect(130 + 120 * i, 40, 80, 200);
    } else {
      ctx.rect(100 + 120 * i, 40, 80, 200);
    }
    ctx.fill();
  }
    // Throw error if a color is undefined
    // Return color
  response.set('Cache-Control', 'public, max-age=60, s-maxage=31536000');
  response.writeHead(200, {'Content-Type': 'image/png'});
  canvas.pngStream().pipe(response);
});
