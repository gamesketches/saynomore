const {WebClient} = require('@slack/web-api');
const {createMessageAdapter} = require('@slack/interactive-messages');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const csv = require('csv-parser');
const fs = require('fs');
const results = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);


let gameStatus = "idle";
let participants = [];
let homeChannel = "";
let cards = [];
let reactions = [];
let curScenario = "";
let picker = "";

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




slackInteractions.action({type:'message_action' }, (payload, respond) => {
	console.log("payload", payload);
});

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
    ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

app.post('/actions', (req,res) => {
	console.log("got a payload");
	const payload = JSON.parse(req.body.payload);
	const {type, user, submission} = payload;

	console.log(payload);
	res.sendStatus(200);
});

app.post('/interactive', (req,res) => {
	console.log("got something");
	
	res.send('');
	const payload = JSON.parse(req.body.payload);
	console.log(payload);
	
	let actionId = payload.actions[0].value;
	
	if(actionId == "click_begin") {
		gameStatus = "playing";
		BeginGame();
	} else if(actionId == "click_join") {
		participants.push(payload.user.id);
	} else if(gameStatus == "playing") {
		if(IsPlayerResponse(actionId)) {
			for(let i = 0; i < participants.length; i++) {
				let player = participants[i];
				if(player.id == payload.user.id) {
					player.response = actionId;
					player.hand.splice(player.hand.indexOf(player.response),1,DrawReactionCard()); 
					player.responded = true;
					participants[i] = player;
					console.log(participants);
					break;
				}
			}
			let allResponded = true;
			for(let i = 0; i < participants.length; i++) {
				if(!participants[i].responded) {
					console.log("someone hasn't responded!");
					allResponded = false;
				}
			}
			if(allResponded) {
				PickWinner();
			}
		} else {
			ScorePoint(actionId);
			PostResponses(actionId);
			CreateNewEventPrompt()
		}
	}  
});

app.post('/saynomore', (req, res) => {
	console.log("say no more post");
	
	homeChannel = req.body.channel_id;
	res.send('');
	StartGame(req.body.channel_id,req.body.user_id);
	console.log(req.body);
});

async function StartGame(channel, starter) {
	let joinBlock = 
		[
			{
				"type":"section",
				"text": {
					"type":"plain_text",
					"text":"Who wants to play Say No More?"
				},
				"accessory": {
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Join"
					},
					"action_id": "click_join",
					"value": "click_join"
				}
		  }
		];	
	let startBlock =
		[
			{
				"type":"section",
				"text": {
					"type":"plain_text",
					"text":"Click here when you're ready to start!"
				},
				"accessory": {
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Begin Game"
					},
					"value": "click_begin"
				}
			}
		];
	try {
		await PostMessage("Click to join", channel, joinBlock);
	} catch(e) {
		console.log(e);
	}

	try {
		await PostEphemeral("Click to begin", channel, starter, startBlock);
	} catch(e) {
		console.log(e);
	}
	
	picker = starter;
	gameStatus = "joining";
};

async function BeginGame() {
	console.log("num participants " + participants.length);
	if(participants.length < 1) {
		try {
			await PostEphemeral("No one wanted to join :(", homeChannel, picker);
		} catch(e) {
			console.log(e);
		}
		gameStatus = "idle";
	} else {
		for(let i = 0; i < participants.length; i++) {
			participants[i] = CreateNewParticipant(participants[i]);
			console.log(participants[i]);
		}
		gameStatus = "playing";
		CreateNewEventPrompt();
	}
}

(async () => {

	const server = app.listen(3000);

	console.log("server up at ", server.address());
})();

function CreateNewEventPrompt() {
	curScenario = cards[Math.floor(cards.length * Math.random())];
	PickNextPicker();
	let promptBlock = [
	{
		"type": "section",
		"text": {
				"type": "plain_text",
				"text": curScenario
			}
	},
	{
		"type": "actions",
		"elements": []
		}
	];
	for(let j = 0; j < participants.length; j++) {
		let player = participants[j];
		player.responded = false;
		for(let i = 0; i < player.hand.length; i++) {
			promptBlock[1].elements.push( {
					"type": "button",
					"text": {
						"type": "plain_text",
						"emoji": true,
						"text": player.hand[i] 
					},
					"value": player.hand[i] 
				});
			}
		try {
			PostEphemeral(curScenario, homeChannel, player.id, promptBlock);
		} catch(e) {
			console.log(e);
		}
	}
}

function IsPlayerResponse(actionId) {
	let notAPlayerId = true;
	participants.forEach(function(player) { 
		if(player.id == actionId) notAPlayerId = false;
		}
	);
	return notAPlayerId;
}

function PickWinner() {
	let promptBlock = [
		{
			"type": "section",
			"text": {
					"type": "plain_text",
					"text": "Pick the best response to the current scenario!"
				}
		},
		{
			"type": "actions",
			"elements": []
			}
		];
	for(let i = 0; i < participants.length; i++) {
		promptBlock[1].elements.push( {
					"type": "button",
					"text": {
						"type": "plain_text",
						"emoji": true,
						"text": participants[i].response 
					},
					"value": participants[i].id 
				});
			}
	PostEphemeral("Pick a winner", homeChannel, picker, promptBlock);
}

function ScorePoint(winnerId) {
	participants.forEach(function(element) { 
		if(element.id == winnerId) element.score++;
	});
}

function PostResponses() {
	let response = "The Scenario: \n" + curScenario + "\nThe Responses:\n"
	for(let i = 0; i < participants.length; i++) {
		response += participants[i].response + "\n";
	}
	try {
		PostMessage(response, homeChannel);
	} catch(e) {
		console.log(e);
	}
}
		

function DrawReactionCard() {
	return reactions[Math.floor(Math.random() * reactions.length)];
}

function CreateNewParticipant(userId) {
	let newHand = [];
	for(let i = 0; i < 5; i++) {
		newHand.push(DrawReactionCard());
	}
	console.log(newHand);
	return {id:userId, hand:newHand, responded:false, score:0};
}

function PickNextPicker() {
	for(let i = 0; i < participants.length; i++) {
		if(participants[i].id == picker) {
			if(i + 1 == participants.length) {
				picker = participants[0].id;
			} else {
				picker = participants[i].id;
				return;
			}
		}
	}
}

async function FindChannelId(channelName) {
	try {
		const res = await web.conversations.list({});
		let channels = res.channels;
		for(let i = 0; i < list.length; i++) {
			if(channels[i].name == channelName) {
				return channels[i].id;
			}
		}
	} catch(e) {
		console.log(e);
	}
}

async function PostMessage(message, targetChannel, blockJson) {
	let args = {text:message, channel:targetChannel, blocks:blockJson};
	try {
		const res = await web.chat.postMessage(args);
		console.log(res);
	} catch(e) {
		console.log(e);
	}
}

async function PostEphemeral(message, targetChannel, targetUser, blockJson) {
	let args = {text:message, channel:targetChannel, user:targetUser, blocks:blockJson, attachments:null};
	try {
		const res = await web.chat.postEphemeral(args);
		console.log(res);
	} catch(e) {
		console.log(e);
	}
}
