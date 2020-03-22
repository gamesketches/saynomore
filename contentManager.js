const csv = require('csv-parser');
const fs = require('fs');

let cards = {recruiting:[], luring:[], grooming:[], coercion:[], exploitation:[]};
let reactions = [];
let results = [];
const recruitingRounds = 2;

fs.createReadStream('OptionAndScenarioCards.csv')
	.pipe(csv())
	.on('data', (data) => results.push(data))
	.on('end', () => {
		console.log("Parsed card data");
		for(let i = 0; i < results.length; i++) {
			if(results[i].Scenario.length > 0) ProcessScenario(results[i]);
			if(results[i].Reaction.length > 0) reactions.push(results[i].Reaction);
		}
		console.log("Num Recruiting Scenarios: " + cards.recruiting.length);
		console.log("Num Luring Scenarios: " + cards.luring.length);
		console.log("Num Grooming & Gaming Scenarios: " + cards.grooming.length);
		console.log("Num Coercion & Manipulation Scenarios: " + cards.coercion.length);
		console.log("Num Exploitation Scenarios: " + cards.exploitation.length);
	});

function ProcessScenario(dataLine) {
	switch(dataLine.Stage) {
		case "Recruiting":
			cards.recruiting.push(dataLine.Scenario);
			break;
		case "Luring":
			cards.luring.push(dataLine.Scenario);
			break;
		case "Grooming & Gaming":
			cards.grooming.push(dataLine.Scenario);
			break;
		case "Coercion & Manipulation":
			cards.coercion.push(dataLine.Scenario);
			break;
		case "Exploitation":
			cards.exploitation.push(dataLine.Scenario);
			break;
		default:
			cards.recruiting.push(dataLine.Scenario);
	}
}

function DrawScenarioCard(roundNum) {
	var drawNum, deck;
	if(roundNum) {
		if(roundNum < recruitingRounds) {
			deck = cards.recruiting;
		} else if(roundNum == recruitingRounds) {
			deck = cards.luring;
		} else if(roundNum == recruitingRounds + 1) {
			deck = cards.grooming;
		} else if(roundNum == recruitingRounds + 2) {
			deck = cards.coercion;
		} else if(roundNum >= recruitingRounds + 3) {
			deck = cards.exploitation;
		} 
	} else {
		drawNum = Math.floor(cards.recruiting.length * Math.random());
		deck = cards.recruiting;
	}
		drawNum = Math.floor(deck.length * Math.random());
		return deck[drawNum];
}

function DrawReactionCard() {
	return reactions[Math.floor(reactions.length * Math.random())];
}

module.exports = {reactions,cards,DrawScenarioCard, DrawReactionCard};
