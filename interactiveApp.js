const {WebClient} = require('@slack/web-api');
const {createMessageAdapter} = require('@slack/interactive-messages');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const results = [];
const blockTemplates = require ('./blockTemplates');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);


const winScore = 5;
let gameStatus = "idle";
let participants = [];
let homeChannel = "";
let cards = [];
let reactions = [];
let curScenario = "";
let picker = "";
let sentMessages = [];
let sentEphemeral = [];

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
		UpdateEphemeralMessage(payload.response_url, "Here we go!");
		gameStatus = "playing";
		BeginGame();
	} else if(actionId == "click_join") {
		participants.push(CreateNewParticipant(payload.user.id,payload.user.name));
		UpdateJoinButton(payload.container.message_ts);
	} else if(gameStatus == "playing") {
		if(IsPlayerResponse(actionId)) {
			ProcessPlayerResponses(payload.user.id, actionId);
			UpdateEphemeralMessage(payload.response_url, "Got it!");
		} else {
			PostResponses(actionId);
			ScorePoint(actionId);
			if(gameStatus != "idle") {
				CreateNewEventPrompt()
			}
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
	let joinBlock = blockTemplates.joinBlock;
	let startBlock = blockTemplates.beginBlock;
		
	PostMessage("Click to join", channel, joinBlock);

	PostEphemeral("Click to begin", channel, starter, startBlock);
	
	picker = starter;
	gameStatus = "joining";
};

async function UpdateJoinButton(timestamp) {
	let joinBlock = blockTemplates.joinBlock;
	
	let contextBlock = {
		"type":"context",
		"elements": []
	};
	
	for(let i = 0; i < participants.length; i++) {
		let args = {user:participants[i].id};
		try {
			const res = await web.users.profile.get(args);
			contextBlock.elements.push({
			"type":"image",
			"image_url": res.profile.image_24,
			"alt_text": participants[i].name
		});
		} catch(e) {
			console.log(e);
		}
		
	}

	joinBlock.push(contextBlock);
	let arg = {channel:homeChannel, text:"Join", ts:timestamp, blocks:joinBlock};
	try {
		const otherRes = web.chat.update(arg);
	} catch(e) {
		console.log(e);
	}
}
async function BeginGame() {
	console.log("num participants " + participants.length);
	if(participants.length < 1) {
		PostEphemeral("No one wanted to join :(", homeChannel, picker);
		gameStatus = "idle";
	} else {
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
		if(player.id == picker) {
			player.responded = true;
			continue;
		}
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
		PostEphemeral(curScenario, homeChannel, player.id, promptBlock);
		promptBlock[1].elements = [];
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

function ProcessPlayerResponses(userId, actionId) {
	for(let i = 0; i < participants.length; i++) {
				let player = participants[i];
				if(player.id == userId) {
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
		if(participants[i].id != picker) {
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
	}
	PostEphemeral("Pick a winner", homeChannel, picker, promptBlock);
}

function ScorePoint(winnerId) {
	participants.forEach(function(player) { 
		if(player.id == winnerId){
			 player.score++;
			 PostMessage(player.name + " won this round with '" + player.response + "'!", homeChannel);
			 if(player.score >= winScore) {
				PostMessage("And with that they won the whole thing! Great game everyone! All messages will be deleted in 30 seconds", homeChannel);
				gameStatus = "idle";
				setTimeout(CleanUpGame, 30000);
		     }
		}
	});
}

function PostResponses() {
	let response = "The Scenario: \n" + curScenario + "\nThe Responses:\n"
	for(let i = 0; i < participants.length; i++) {
		response += participants[i].response + "\n";
	}
	PostMessage(response, homeChannel);
}
		

function DrawReactionCard() {
	return reactions[Math.floor(Math.random() * reactions.length)];
}

function CreateNewParticipant(userId,userName) {
	let newHand = [];
	for(let i = 0; i < 5; i++) {
		newHand.push(DrawReactionCard());
	}
	return {id:userId, name:userName, hand:newHand, responded:false, score:0};
}

function PickNextPicker() {
	for(let i = 0; i < participants.length; i++) {
		if(participants[i].id == picker) {
			if(i + 1 == participants.length) {
				picker = participants[0].id;
				console.log(participants[0].name);
			} else {
				picker = participants[i+1].id;
				console.log(participants[i+1].name);
				return;
			}
		}
	}
}

async function CleanUpGame() {
	gameStatus = "idle";
	for(let i = 0; i < sentMessages.length; i++) {
		let args = {channel:homeChannel,ts:sentMessages[i]};
		try {
			const res = await web.chat.delete(args);
		} catch(e) {
			console.log(e);
		}
	}
	for(let i = 0; i < sentEphemeral.length; i++) {
			DeleteEphemeralMessage(sentEphemeral[i]);
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
		sentMessages.push(res.ts);
		console.log(res);
	} catch(e) {
		console.log(e);
	}
}

async function PostEphemeral(message, targetChannel, targetUser, blockJson) {
	let args = {text:message, channel:targetChannel, user:targetUser, blocks:blockJson, attachments:null};
	try {
		const res = await web.chat.postEphemeral(args);
		sentEphemeral.push(res.response_url);
		console.log(res);
	} catch(e) {
		console.log(e);
	}
}

function UpdateEphemeralMessage(response_url, newText) {
	axios.post(response_url, {
			"replace_original":"true",
			"text": newText 
		}).then(function (response) {
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
}

function DeleteEphemeralMessage(response_url) {
	axios.post(response_url, {
			"delete_original":"true"
		}).then(function(response) {
			console.log(response);
		}).catch(function (error) {
			console.log(error);
		});
}
