# Resistor Agent

This is an app for Actions on Google which provides the user with the ability to query information about resistors.

Resistors are one of four passive electrical components which provides standard impedance in a circuit. A resistor can
have one of many different impedances. Standard components are all the same size, with different patterns of colors that allow
an engineer to identify the impedance.

<img src='https://raw.githubusercontent.com/fleker/resistor-agent/master/screenshots/resistor-color-chart.jpg' />

The chart, from [DigiKey](https://www.digikey.com/en/resources/conversion-calculators/conversion-calculator-resistor-color-code-4-band), can make it possible to decode the colors. However, it can be a time-intensive process.

Using the Google Assistant, this agent is able to do the same task hands-free. You can identify the impedance based on colors, or identify the colors of a particular impedance.

You can get started right now by invoking a request to the app through the Google Assistant:

"OK Google, ask the resistance about a 3.3 k ohm resistor"

"OK Google, ask the resistance about a red, orange, and black resistor"

## Decode Colors
<img src='https://raw.githubusercontent.com/Fleker/resistor-agent/master/screenshots/decode-2.png' />

"what type of resistor is orange, orange, black, brown and brown"

"That is a 3.3 Kilo Ohm resistor with a 1 percent tolerance"

## Encode Colors
<img src='https://raw.githubusercontent.com/Fleker/resistor-agent/master/screenshots/encode-1.png' />

"what type of resistor is 3.3 k ohm"

"A 3300 Ohm resistor has the colors orange, orange, and red"

**Note**: You can mention that you want a '5-strip' resistor to get four colors as a response.

## What's included?

This project includes:

* Cloud Functions for Firebase to handle requests
* [API.ai](http://api.ai) exported agent in the [Releases](/releases) section

## Setup Instructions

* Create a new [API.ai](http://api.ai) project and import the zip
* Create a new Firebase project
    * Deploy [the functions](https://firebase.google.com/docs/functions/) located in `/functions/`
    * Obtain the URL `https://XXX.cloudfunctions.net/api_v1`
    * Paste this as the webhook in the Fulfillment section of your agent on API.ai

## halp pls

* If you find any issues, please open a bug on [GitHub](/issues).

## How to make contributions?
Please read and follow the steps in the CONTRIBUTING.md.

## License
See LICENSE.md.
