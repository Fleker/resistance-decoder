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

'use strict';

// Define constants. This is their digit value, either alone or 10^x.
// Source: https://www.digikey.com/-/media/Images/Marketing/Resources/Calculators/resistor-color-chart.jpg?la=en-US&ts=72364a89-2139-476a-8a54-8d78dacd29ff

const Colors = {
  BLACK: 'BLACK',
  BROWN: 'BROWN',
  RED: 'RED',
  ORANGE: 'ORANGE',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  VIOLET: 'VIOLET',
  GREY: 'GREY',
  WHITE: 'WHITE',
  GOLD: 'GOLD',
  SILVER: 'SILVER'
};

const ColorsArray = [
    // Map band digits to color
    // Gold & Silver are not used in band values, only for the multiplier
  Colors.BLACK, Colors.BROWN, Colors.RED, Colors.ORANGE, Colors.YELLOW, Colors.GREEN,
  Colors.BLUE, Colors.VIOLET, Colors.GREY, Colors.WHITE
];

const HexValues = {
  BLACK: '#263238',
  BROWN: '#795548',
  RED: '#f44336',
  ORANGE: '#ff9800',
  YELLOW: '#ffeb3b',
  GREEN: '#4caf50',
  BLUE: '#2196f3',
  VIOLET: '#9c27b0',
  GREY: '#9e9e9e',
  WHITE: '#fafafa',
  GOLD: '#ffc107',
  SILVER: '#607d8b'
};

class ResistorStripe {
  constructor (color, value, hex) {
    this.color = color;
    this.value = value;
    this.hex = hex;
  }
}

const Bands = {
  BLACK: new ResistorStripe(Colors.BLACK, 0, HexValues.BLACK),
  BROWN: new ResistorStripe(Colors.BROWN, 1, HexValues.BROWN),
  RED: new ResistorStripe(Colors.RED, 2, HexValues.RED),
  ORANGE: new ResistorStripe(Colors.ORANGE, 3, HexValues.ORANGE),
  YELLOW: new ResistorStripe(Colors.YELLOW, 4, HexValues.YELLOW),
  GREEN: new ResistorStripe(Colors.GREEN, 5, HexValues.GREEN),
  BLUE: new ResistorStripe(Colors.BLUE, 6, HexValues.BLUE),
  VIOLET: new ResistorStripe(Colors.VIOLET, 7, HexValues.VIOLET),
  GREY: new ResistorStripe(Colors.GREY, 8, HexValues.GREY),
  WHITE: new ResistorStripe(Colors.WHITE, 9, HexValues.WHITE),
  GOLD: new ResistorStripe(Colors.GOLD, -1, HexValues.GOLD),    // x0.1 Ohm
  SILVER: new ResistorStripe(Colors.SILVER, -2, HexValues.SILVER) // x0.01 Ohm
};

const Tolerances = {
  BLACK: new ResistorStripe(Colors.BLACK, 0, HexValues.BLACK), // N/A
  BROWN: new ResistorStripe(Colors.BROWN, 1, HexValues.BROWN),
  RED: new ResistorStripe(Colors.RED, 2, HexValues.RED),
  ORANGE: new ResistorStripe(Colors.ORANGE, 0, HexValues.ORANGE), // N/A
  YELLOW: new ResistorStripe(Colors.YELLOW, 5, HexValues.YELLOW), // Copy GOLD
  GREEN: new ResistorStripe(Colors.GREEN, 0.5, HexValues.GREEN),
  BLUE: new ResistorStripe(Colors.BLUE, 0.25, HexValues.BLUE),
  VIOLET: new ResistorStripe(Colors.VIOLET, 0.1, HexValues.VIOLET),
  GREY: new ResistorStripe(Colors.GREY, 0.05, HexValues.GREY),
  WHITE: new ResistorStripe(Colors.WHITE, 0, HexValues.WHITE), // N/A
  GOLD: new ResistorStripe(Colors.GOLD, 5, HexValues.GOLD),
  SILVER: new ResistorStripe(Colors.SILVER, 10, HexValues.SILVER)
};

const UnitValues = {
  kilo: 1000,
  mega: 1000000,
  giga: 1000000000
};

const RESISTOR_IMAGE_ENDPOINT = 'https://us-central1-newagent-ecf2d.cloudfunctions.net/resistor_image';

class Resistor {
  constructor () {
    this.stripes = [];
    this.colors = [];
    this.values = [];
    this.debugLogs = false;
  }

  decodeResistor_ (color0, color1, color2, multiplier, tolerance) {
    this.colors = [color0, color1, color2, multiplier, tolerance];
    console.log(this.colors);
    this.stripes = this.generateStripes();
  }

  encodeResistor_ (requestImpedance, units, type) {
    let unitsValue = 1;
    let impedance = requestImpedance;
    if (units) {
      unitsValue = UnitValues[units];
      impedance *= unitsValue;
    }

     // First, obtain the magnitude.
    let magnitude = Math.floor(Math.log10(impedance));
    let magMod;
    if (type === '5-strip') {
      // In a 5-strip resistor, the magnitude is slightly smaller
      magnitude -= 2; // all magnitudes are shifted down 100
      magMod = 2;
    } else {
      magnitude -= 1; // all magnitudes are shifted down 10
      magMod = 1;
    }
    if (magnitude === -2) {
      this.stripes[3] = Bands.SILVER;
    } else if (magnitude === -1) {
      this.stripes[3] = Bands.GOLD;
    } else {
      this.stripes[3] = Bands[ColorsArray[magnitude]];
    }

    // Next, obtain the leading digit.
    let leadingDigit = Math.floor(impedance / Math.pow(10, magnitude + magMod));
    this.stripes[0] = Bands[ColorsArray[leadingDigit]];

    // Next, obtain the second digit.
    let secondaryDigit = Math.floor(impedance / Math.pow(10, magnitude + magMod - 1)) -
        leadingDigit * 10;
    this.stripes[1] = Bands[ColorsArray[secondaryDigit]];

    if (type === '5-strip') {
        // Obtain the tertiary digit.
      let tertiaryDigit = Math.floor(impedance / Math.pow(10, magnitude + magMod - 2)) -
        leadingDigit * 100 - secondaryDigit * 10;
      this.stripes[2] = Bands[ColorsArray[tertiaryDigit]];
    }
  }

  fromColorNames (color0, color1, color2, color3, color4) {
    // DECODE
    // Generate resistor from color names
    console.log(color0, color1, color2, color3, color4);
    if (!color3 || color3.length === 0) {
      // Three colors
      console.log('3-strip resistor');
      this.decodeResistor_(color0, color1, undefined, color2, undefined);
    } else if (!color4 || color4.length === 0) {
      // Four colors
      console.log('4-strip resistor');
      this.decodeResistor_(color0, color1, undefined, color2, color3);
    } else {
      // Five colors
      console.log('5-strip resistor');
      this.decodeResistor_(color0, color1, color2, color3, color4);
    }
  }

  fromNumericalParameters (number, units, type) {
    // ENCODE
    this.encodeResistor_(number, units, type);
  }

  /**
   * @return string
   */
  get displayColors () {
    let output = `A ${this.getDisplayImpedance()} Ohm resistor has the colors ` +
            `${this.stripes[0].color.toLowerCase()}, ${this.stripes[1].color.toLowerCase()}`;
    if (this.stripes[2]) {
      output += `, ${this.stripes[2].color.toLowerCase()}, and ${this.stripes[3].color.toLowerCase()}.`;
    } else {
      output += `, and ${this.stripes[3].color.toLowerCase()}.`;
    }
    return output;
  }

  get displayImpedance () {
    let impedance = this.impedance;
    let output = impedance;
    if (impedance > UnitValues.giga) {
      output = impedance / UnitValues.giga + ' Giga';
    } else if (impedance > UnitValues.mega) {
      output = impedance / UnitValues.mega + ' Mega';
    } else if (impedance > UnitValues.kilo) {
      output = impedance / UnitValues.kilo + ' Kilo';
    }
    return output;
  }

  get imageUrl () {
    let colorsString = '';
    for (let i in this.stripes) {
      if (this.stripes[i]) {
        colorsString += `${this.stripes[i].color},`;
      }
    }
    colorsString = colorsString.substring(0, colorsString.length - 1);
    return `${RESISTOR_IMAGE_ENDPOINT}?background=true&colors=${colorsString.toUpperCase()}`;
  }

  get impedance () {
    console.log(this.stripes);
    let impedance = 0;
    impedance += this.stripes[0].value * 100;
    impedance += this.stripes[1].value * 10;

    if (this.stripes[2]) {
      impedance += this.stripes[2].value * 10;
    } else {
      impedance /= 10; // Shift down because there are only 2 parameters
    }

    // Multiplier
    impedance *= Math.pow(10, this.stripes[3].value);
    return impedance;
  }

  get tolerance () {
    if (this.colors[4]) {
      let color = this.colors[4].toUpperCase();
      let stripe = Tolerances[Colors[color]];
      return stripe.value;
    }
  }

/*  get stripes () {
    return this.stripes;
  }
*/

  generateStripes () {
    if (this.colors.length === 0) {
      return undefined;
    }
    let stripes = [];
    for (let i = 0; i < 4; i++) { // 0 - 3
      if (this.colors[i]) {
        let color = this.colors[i].toUpperCase();
        let stripe = Bands[color];
        stripes[i] = (stripe);
      } else {
        stripes[i] = undefined;
      }
    }
    if (this.colors[4]) { // Tolerance
      let color = this.colors[4].toUpperCase();
      let stripe = Tolerances[color];
      stripes[4] = stripe;
    } else {
      stripes[4] = undefined;
    }
    return stripes;
  }
}

module.exports = {
  Resistor: Resistor,
  ColorsArray: ColorsArray,
  Colors: Colors,
  HexValues: HexValues,
  Bands: Bands,
  Tolerances: Tolerances,
  UnitValues: UnitValues,
  ResistorStripe: ResistorStripe,
  RESISTOR_IMAGE_ENDPOINT: RESISTOR_IMAGE_ENDPOINT
};
