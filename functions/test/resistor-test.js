/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
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

const winston = require('winston');
const chai = require('chai');
const expect = chai.expect;
const { Resistor,
    ColorsArray,
    Colors,
    HexValues,
    Bands,
    Tolerances,
    UnitValues,
    ResistorStripe,
    RESISTOR_IMAGE_ENDPOINT
} = require('.././resistor');

// Default logger 🌳
winston.loggers.add('DEFAULT_LOGGER', {
  console: {
    level: 'error',
    colorize: true,
    label: 'Default logger',
    json: true,
    timestamp: true
  }
});

describe('Constants', () => {
  describe('#ColorsArray', () => {
    // validates the size of the array
    it('validates the size of the array', () => {
      expect(ColorsArray.length).to.be.equal(10);
    });

    // validates the right order
    it('validates the right order', () => {
      expect(ColorsArray).to.be.deep.equal(['BLACK', 'BROWN', 'RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE',
        'VIOLET', 'GREY', 'WHITE']);
    });
  });

  describe('#HexValues', () => {
    // validates the right color
    it('validates the right color', () => {
      const RED = '#f44336';
      const nameRed = 'red';
      expect(HexValues['RED']).to.be.equal(RED);
      expect(HexValues[nameRed.toUpperCase()]).to.be.equal(RED);
      expect(HexValues[Colors.RED]).to.be.equal(RED);
      expect(HexValues[Colors[nameRed.toUpperCase()]]).to.be.equal(RED);
    });
  });

  describe('#Bands', () => {
    it('validates the right values', () => {
      const BAND_ORANGE = Bands.ORANGE;
      expect(BAND_ORANGE.color).to.be.equal(Colors.ORANGE);
      expect(BAND_ORANGE.value).to.be.equal(3);
      expect(BAND_ORANGE.hex).to.be.equal(HexValues.ORANGE);
    });

    it('validates the right band', () => {
      expect(Bands[Colors['ORANGE']].value).to.be.equal(3);
    });
  });

  describe('#Tolerances', () => {
    it('validates the right values', () => {
      const TOLERANCE_ORANGE = Tolerances.ORANGE;
      expect(TOLERANCE_ORANGE.color).to.be.equal(Colors.ORANGE);
      expect(TOLERANCE_ORANGE.value).to.be.equal(0);
      expect(TOLERANCE_ORANGE.hex).to.be.equal(HexValues.ORANGE);
    });

    it('validates the right band', () => {
      expect(Tolerances[Colors['ORANGE']].value).to.be.equal(0);
    });
  });

  describe('#UnitValues', () => {
    it('validates the right magnitude', () => {
      expect(UnitValues.kilo).to.be.equal(Math.pow(10, 3));
      expect(UnitValues.mega).to.be.equal(Math.pow(10, 6));
      expect(UnitValues.giga).to.be.equal(Math.pow(10, 9));
    });
  });
});

describe('ResistorStripe', () => {
  describe('Constructor', () => {
    it('should correctly create a generic stripe', () => {
      let stripe = new ResistorStripe(Colors.RED, 5, HexValues.RED);
      expect(stripe.color).to.be.equal(Colors.RED);
      expect(stripe.value).to.be.equal(5);
      expect(stripe.hex).to.be.equal(HexValues.RED);
    });
  });
});

describe('Resistor', () => {
  describe('class', () => {
    it('#constructor', () => {
      const resistor = new Resistor();
      expect(resistor.debugLogs).to.be.equal(false);
      expect(resistor.getStripes()).to.be.deep.equal([]);
    });
  });

  describe('Decoding', () => {
    it('parse 3-stripe color names', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'blue', 'yellow', undefined, undefined);
      expect(resistor.colors).to.be.deep.equal(['red', 'blue', undefined, 'yellow', undefined]);
      const stripes = resistor.getStripes();
      expect(stripes[0].color).to.be.equal(Colors.RED);
      expect(stripes[1].color).to.be.equal(Colors.BLUE);
      expect(stripes[2]).to.be.equal(undefined);
      expect(stripes[3].color).to.be.equal(Colors.YELLOW);
      expect(stripes[4]).to.be.equal(undefined);
    });

    it('parse 4-stripe color names', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'blue', 'yellow', 'orange', undefined);
      expect(resistor.colors).to.be.deep.equal(['red', 'blue', undefined, 'yellow', 'orange']);
      const stripes = resistor.getStripes();
      expect(stripes[0].color).to.be.equal(Colors.RED);
      expect(stripes[1].color).to.be.equal(Colors.BLUE);
      expect(stripes[2]).to.be.equal(undefined);
      expect(stripes[3].color).to.be.equal(Colors.YELLOW);
      expect(stripes[4].color).to.be.equal(Colors.ORANGE);
    });

    it('parse 5-stripe color names', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'blue', 'yellow', 'orange', 'gold');
      expect(resistor.colors).to.be.deep.equal(['red', 'blue', 'yellow', 'orange', 'gold']);
      const stripes = resistor.getStripes();
      expect(stripes[0].color).to.be.equal(Colors.RED);
      expect(stripes[1].color).to.be.equal(Colors.BLUE);
      expect(stripes[2].color).to.be.equal(Colors.YELLOW);
      expect(stripes[3].color).to.be.equal(Colors.ORANGE);
      expect(stripes[4].color).to.be.equal(Colors.GOLD);
    });

    it('22K Ohm decoding', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'red', 'orange', undefined, undefined);
      expect(resistor.getImpedance()).to.be.equal(22000);
      expect(resistor.getTolerance()).to.be.equal(undefined);
      expect(resistor.getImageUrl()).to.be
                  .equal(`${RESISTOR_IMAGE_ENDPOINT}?background=true&colors=RED,RED,ORANGE`);
      expect(resistor.getDisplayImpedance()).to.be.equal('22 Kilo');
    });

    it('220 Ohm decoding with empty strings', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'red', 'brown', '', '');
      expect(resistor.colors).to.be.deep.equal(['red', 'red', undefined, 'brown', undefined]);
      expect(resistor.getImpedance()).to.be.equal(220);
      expect(resistor.getTolerance()).to.be.equal(undefined);
      expect(resistor.getImageUrl()).to.be
                .equal(`${RESISTOR_IMAGE_ENDPOINT}?background=true&colors=RED,RED,BROWN`);
      expect(resistor.getDisplayImpedance()).to.be.equal(220);
    });

    it('220 Ohm decoding with null strings', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'red', 'brown', null, null);
      expect(resistor.colors).to.be.deep.equal(['red', 'red', undefined, 'brown', undefined]);
      expect(resistor.getImpedance()).to.be.equal(220);
      expect(resistor.getTolerance()).to.be.equal(undefined);
      expect(resistor.getImageUrl()).to.be
                  .equal(`${RESISTOR_IMAGE_ENDPOINT}?background=true&colors=RED,RED,BROWN`);
      expect(resistor.getDisplayImpedance()).to.be.equal(220);
    });

    it('22K Ohm 5% decoding', () => {
      const resistor = new Resistor();
      resistor.fromColorNames('red', 'red', 'orange', 'gold', undefined);
      expect(resistor.getImpedance()).to.be.equal(22000);
      expect(resistor.getTolerance()).to.be.equal(5);
      expect(resistor.getImageUrl()).to.be
                .equal(`${RESISTOR_IMAGE_ENDPOINT}?background=true&colors=RED,RED,ORANGE,GOLD`);
      expect(resistor.getDisplayImpedance()).to.be.equal('22 Kilo');
    });
  });

  describe('Encoding', () => {
    it('encodes 3-strip 220 Ohm', () => {
      const resistor = new Resistor();
      resistor.fromNumericalParameters(220, undefined, undefined);
      expect(resistor.stripes[0].color).to.be.equal(Colors.RED);
      expect(resistor.stripes[1].color).to.be.equal(Colors.RED);
      expect(resistor.stripes[2]).to.be.equal(undefined);
      expect(resistor.stripes[3].color).to.be.equal(Colors.BROWN);
      expect(resistor.stripes[4]).to.be.equal(undefined);
    });

    it('should provide access to decoding functions', () => {
      const resistor = new Resistor();
      resistor.fromNumericalParameters(220, undefined, undefined);
      expect(resistor.getImpedance()).to.be.equal(220);
      expect(resistor.getTolerance()).to.be.equal(undefined);
      expect(resistor.getImageUrl()).to.be
                .equal(`${RESISTOR_IMAGE_ENDPOINT}?background=true&colors=RED,RED,BROWN`);
      expect(resistor.getDisplayImpedance()).to.be.equal(220);
    });

    it('encodes 3-strip 1 Ohm', () => {
      const resistor = new Resistor();
      resistor.fromNumericalParameters(1, undefined, undefined);
      expect(resistor.stripes[0].color).to.be.equal(Colors.BROWN);
      expect(resistor.stripes[1].color).to.be.equal(Colors.BLACK);
      expect(resistor.stripes[2]).to.be.equal(undefined);
      expect(resistor.stripes[3].color).to.be.equal(Colors.GOLD);
      expect(resistor.stripes[4]).to.be.equal(undefined);
    });

    it('encodes 5-strip 543 Ohm', () => {
      const resistor = new Resistor();
      resistor.fromNumericalParameters(543, undefined, '5-strip');
      expect(resistor.stripes[0].color).to.be.equal(Colors.GREEN);
      expect(resistor.stripes[1].color).to.be.equal(Colors.YELLOW);
      expect(resistor.stripes[2].color).to.be.equal(Colors.ORANGE);
      expect(resistor.stripes[3].color).to.be.equal(Colors.BLACK);
      expect(resistor.stripes[4]).to.be.equal(undefined);
    });

    it('encodes 5-strip 543 KOhm', () => {
      const resistor = new Resistor();
      resistor.fromNumericalParameters(543, 'kilo', '5-strip');
      expect(resistor.stripes[0].color).to.be.equal(Colors.GREEN);
      expect(resistor.stripes[1].color).to.be.equal(Colors.YELLOW);
      expect(resistor.stripes[2].color).to.be.equal(Colors.ORANGE);
      expect(resistor.stripes[3].color).to.be.equal(Colors.ORANGE);
      expect(resistor.stripes[4]).to.be.equal(undefined);
    });

    it('encodes 5-strip 5.43 MOhm', () => {
      const resistor = new Resistor();
      resistor.fromNumericalParameters(5.43, 'mega', '5-strip');
      expect(resistor.stripes[0].color).to.be.equal(Colors.GREEN);
      expect(resistor.stripes[1].color).to.be.equal(Colors.YELLOW);
      expect(resistor.stripes[2].color).to.be.equal(Colors.ORANGE);
      expect(resistor.stripes[3].color).to.be.equal(Colors.YELLOW);
      expect(resistor.stripes[4]).to.be.equal(undefined);
    });
  });
});
