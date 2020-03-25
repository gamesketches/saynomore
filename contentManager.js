const csv = require('csv-parser');
const fs = require('fs');

let cards = {recruiting:[], luring:[], grooming:[], coercion:[], exploitation:[]};
let reactions = {positive:[], neutral:[], negative:[]};
let results = [];
const recruitingRounds = 2;
let cardBalancer = 0;

fs.createReadStream('OptionAndScenarioCards.csv')
	.pipe(csv())
	.on('data', (data) => results.push(data))
	.on('end', () => {
		console.log("Parsed card data");
		for(let i = 0; i < results.length; i++) {
			if(results[i].Scenario.length > 0) ProcessScenario(results[i]);
			if(results[i].Reaction.length > 0) ProcessReaction(results[i]);
		}
		console.log("Num Recruiting Scenarios: " + cards.recruiting.length);
		console.log("Num Luring Scenarios: " + cards.luring.length);
		console.log("Num Grooming & Gaming Scenarios: " + cards.grooming.length);
		console.log("Num Coercion & Manipulation Scenarios: " + cards.coercion.length);
		console.log("Num Exploitation Scenarios: " + cards.exploitation.length);
		console.log("Num positive reactions: " + reactions.positive.length);
		console.log("Num neutral reactions: " + reactions.neutral.length);
		console.log("Num negative reactions: " + reactions.negative.length);
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

function ProcessReaction(dataLine) {
	switch(dataLine.Emotion) {
		case "P":
			reactions.positive.push(dataLine.Reaction);
			break;
		case "Ne":
			reactions.neutral.push(dataLine.Reaction);
			break;
		case "N":
			reactions.negative.push(dataLine.Reaction);
			break;
		default:
			reactions.neutral.push(dataLine.Reaction);
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
	var drawNum, deck;
	switch(cardBalancer) {
		case 0:
			deck = reactions.positive;
			break;
		case 1:
			deck = reactions.neutral;
			break;
		case 2:
			deck = reactions.negative;
			break;
		default:
			deck = reactions.neutral;
	} 
	drawNum = Math.floor(deck.length * Math.random());
	cardBalancer = (cardBalancer + 1) % 3;
	return deck[drawNum];
}

function WriteInteractions(interactions) {
	let outputString = "";
	interactions.forEach(function ( dataLine) {
		outputString += dataLine.action + "," + dataLine.user + "," + dataLine.misc + "\n"
	});
	let dateObj = new Date();
	let fileName = String(dateObj.getHours()) + ":" + String(dateObj.getMinutes()) + ".csv";
	console.log(fileName);
	fs.writeFile(fileName, outputString, function(err) {
		if(err) console.log(err);
		else console.log("successfully exported to " + fileName);
		}
	);
}


module.exports = {reactions,cards,DrawScenarioCard, DrawReactionCard,WriteInteractions};
