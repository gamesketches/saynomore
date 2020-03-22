const csv = require('csv-parser');
const fs = require('fs');

let cards = [];
let reactions = [];
let results = [];

fs.createReadStream('OptionAndScenarioCards.csv')
	.pipe(csv())
	.on('data', (data) => results.push(data))
	.on('end', () => {
		console.log("Parsed card data");
		for(let i = 0; i < results.length; i++) {
			if(results[i].Scenario.length > 0) cards.push(results[i].Scenario);
			if(results[i].Reaction.length > 0) reactions.push(results[i].Reaction);
		}
	});

function DrawScenarioCard() {
	return cards[Math.floor(cards.length * Math.random())];
}

function DrawReactionCard() {
	return reactions[Math.floor(reactions.length * Math.random())];
}

module.exports = {reactions,cards,DrawScenarioCard, DrawReactionCard};
