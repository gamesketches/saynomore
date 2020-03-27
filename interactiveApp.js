const {WebClient} = require('@slack/web-api');
const {createMessageAdapter} = require('@slack/interactive-messages');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const axios = require('axios');
const blockTemplates = require ('./blockTemplates');
const contentManager = require('./contentManager');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);


const winScore = 5;
let gameStatus = "idle";
let participants = [];
let homeChannel = "";
let curScenario = "";
let picker = "";
let sentMessages = [];
let sentEphemeral = [];
let customThreshold = 5;
let interactions = [];
let queuedMessages = [];

slackInteractions.action({type:'message_action' }, (payload, respond) => {
	//console.log("payload", payload);
	console.log("received action payload");
});

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
    ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

app.post('/actions', (req,res) => {
	console.log("got a payload");
	const payload = JSON.parse(req.body.payload);
	const {type, user, submission} = payload;

	//console.log(payload);
	res.sendStatus(200);
});

app.post('/interactive', (req,res) => {
	console.log("got something");
	
	res.send('');
	const payload = JSON.parse(req.body.payload);
	//console.log(payload);
	
	if(payload.type == "view_submission") {
		if(payload.view.title.text == blockTemplates.enterModal.title.text) {
			let blockInfo = payload.view.blocks[1];
			let userPrompt = payload.view.state.values[blockInfo.block_id][blockInfo.element.action_id].value;
			CreateNewEventPrompt(userPrompt);
			RecordInteraction("Made Custom Scenario", payload.user.name, userPrompt);
		} else if(payload.view.title.text == blockTemplates.enterResponseModal.title.text) {
			let blockInfo = payload.view.blocks[1];
			let userResponse = payload.view.state.values[blockInfo.block_id][blockInfo.element.action_id].value;
			ProcessCustomResponse(payload.user.id, userResponse);
			RecordInteraction("Made Custom Response", payload.user.name, userPrompt);
		}
	} else {
		let actionId = payload.actions[0].value;
		
		if(actionId == "click_begin") {
			UpdateEphemeralMessage(payload.response_url, "Here we go!");
			RecordInteraction("Began game", payload.user.name);
			BeginGame();
		} else if(actionId == "click_join") {
			AddParticipant(payload.user.id, payload.user.name);
			UpdateJoinButton(payload.container.message_ts);
			RecordInteraction("Join game", payload.user.name);
		} else if(actionId == "Make Your Own") {
			OpenModal(payload.trigger_id, blockTemplates.enterResponseModal);
			UpdateEphemeralMessage(payload.response_url, "Got it!");
		} else if(gameStatus == "playing") {
			if(actionId == "click_next_round") {
				RecordInteraction("Started Next Round", payload.user.name);
				if(RoundNumber() > customThreshold) {
					OpenModal(payload.trigger_id, blockTemplates.enterModal);
				} else {
					CreateNewEventPrompt();
				}
			} else if(IsPlayerResponse(actionId)) {
				RecordInteraction("Selected response", payload.user.name, actionId);
				ProcessPlayerResponses(payload.user.id, actionId);
				UpdateEphemeralMessage(payload.response_url, "Got it!");
			}  else {
				ScorePoint(actionId);
				RecordInteraction("Selected Winner", payload.user.name, actionId);
				SetNextRoundButton(payload.response_url);
			}
		}  
	}
});

app.post('/saynomore', (req, res) => {
	console.log("say no more post");
	
	homeChannel = req.body.channel_id;
	res.send('');
	StartGame(req.body.channel_id,req.body.user_id);
	//console.log(req.body);
});

async function StartGame(channel, starter) {
	let joinBlock = JSON.parse(JSON.stringify(blockTemplates.joinBlock));
	let startBlock = blockTemplates.beginBlock;
		
	PostMessage("Click to join", channel, joinBlock);

	PostEphemeral("Click to begin", channel, starter, startBlock);
	
	picker = starter;
	gameStatus = "joining";
};

async function UpdateJoinButton(timestamp) {
	let joinBlock = JSON.parse(JSON.stringify(blockTemplates.joinBlock));
	
	let contextBlock = {
		"type":"context",
		"elements": [
			{
				"type":"plain_text",
				"text": participants.length + " players"
			}
		]
	};
	
	/*for(let i = 0; i < participants.length; i++) {
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
		
	}*/

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

(async () => {
	while(true) {
		await Sleep(500);
		while(queuedMessages.length > 0) {
			if(queuedMessages[0].isEphemeral) {
				try {
					const res = await web.chat.postEphemeral(queuedMessages[0].msgArgs);
					sentEphemeral.push(res.response_url);
				} catch(e) {
					console.log("Error posting ephemeral message");
					console.log(e);
				}
			} else {
				try {
					const res = await web.chat.postMessage(queuedMessages[0].msgArgs);
					sentMessages.push(res.ts);
					console.log(res);
				} catch(e) {
					console.log("Error posting message");
					console.log(e);
				}
			}
			queuedMessages.shift();
			Sleep(250);	
		}
	}
})();

function CreateNewEventPrompt(playerPrompt) {
	if(playerPrompt == null){
		curScenario = contentManager.DrawScenarioCard(RoundNumber());
	} else {
		curScenario = playerPrompt;
		console.log("curScenario is: " + curScenario);
	}

	PickNextPicker();
	
	let scenarioBlock = CopyBlockTemplate(blockTemplates.scenario);
	scenarioBlock[0].text.text = "Scenario #" + String(RoundNumber() + 1) + "\n:black_heart: " + curScenario + ":black_heart:";

	PostMessage(curScenario, homeChannel, scenarioBlock);
	
	for(let j = 0; j < participants.length; j++) {
		let player = participants[j];
		if(player.id == picker && participants.length > 1) {
			player.responded = true;
			PostEphemeral("You're picking this round! Sit tight while people post their responses!", homeChannel, player.id);
			continue;
		}
		player.responded = false;
		let promptBlock = [
			{
				"type": "section",
				"text": {
						"type": "plain_text",
						"text": "Pick how you would respond to the scenario above"
					}
			},
			{
				"type": "actions",
				"elements": []
				}
		];
		for(let i = 0; i < player.hand.length; i++) {
			let cardText = player.hand[i];
			if(RoundNumber() > customThreshold && i == player.hand.length -1) cardText = "Make Your Own";
			promptBlock[1].elements.push( {
					"type": "button",
					"text": {
						"type": "plain_text",
						"emoji": true,
						"text": cardText 
					},
					"value": cardText
				});
			}
		PostEphemeral(curScenario, homeChannel, player.id, promptBlock);
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
			player.hand.splice(player.hand.indexOf(player.response),1); 
			let newCard = contentManager.DrawReactionCard();
			while(player.hand.indexOf(newCard) > -1) {
				newCard = contentManager.DrawReactionCard();
			}
			player.hand.push(newCard);
			player.responded = true;
			participants[i] = player;
			console.log(participants);
			break;
		}
	}
	CheckAllResponded();
}

function ProcessCustomResponse(userId, responseText) {
	for(let i = 0; i < participants.length; i++) {
		let player = participants[i];
		if(player.id == userId) {
			player.response = responseText;
			player.responded = true;
			participants[i] = player;
			break;
		}
	}
	CheckAllResponded();
}

function CheckAllResponded() {
	let allResponded = true;
	for(let i = 0; i < participants.length; i++) {
		if(!participants[i].responded) {
			console.log("someone hasn't responded!");
			allResponded = false;
		}
	}
	if(allResponded) {
		PostResponses();
		PickWinner();
	}
}

function PickWinner() {
	let promptBlock = [
		{
			"type": "section",
			"text": {
					"type": "mrkdwn",
					"text": "Pick the best response to the following scenario:\n\"*" + curScenario + "*\""
				}
		},
		{
			"type": "actions",
			"elements": []
			}
		];
	for(let i = 0; i < participants.length; i++) {
		if(participants.length == 1 || participants[i].id != picker) {
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

function SetNextRoundButton(response_url) {
   nextRoundBlock = [{
       "type":"section",
       "text": {
           "type":"plain_text",
           "text":"Click here when everyone is ready to keep playing!"
       },
       "accessory": {
           "type": "button",
           "text": {
               "type": "plain_text",
               "text": "Being Next Round"
           },
           "value": "click_next_round"
       }
   }];
	axios.post(response_url, {
			"replace_original":"true",
			"text": "Click here when everyone is ready",
			"blocks": nextRoundBlock
		}).then(function (response) {
			//console.log(response);
		}).catch(function (error) {
			console.log("Error updating ephemeral message");
			console.log(error);
		});
}

function ScorePoint(winnerId) {
	let roundEndBlocks = JSON.parse(JSON.stringify(blockTemplates.roundEnd));
	console.log(roundEndBlocks[0].text);
	participants.forEach(function(player) { 
		if(player.id == winnerId){
			 player.score++;
			roundEndBlocks[0].text.text = ":trophy: " + player.name + " won this round with '" + player.response + "'!";
			console.log(roundEndBlocks[0].text);
			PostMessage(player.name + "won!", homeChannel, roundEndBlocks);
			 if(player.score >= winScore) {
				PostMessage("And with that they won the whole thing! Great game everyone! All messages will be deleted in 30 seconds", homeChannel);
				gameStatus = "idle";
				setTimeout(CleanUpGame, 30000);
				contentManager.WriteInteractions(interactions);
		     }
		}
	});
}

function PostResponses() {
	console.log(blockTemplates.responseList);
	let response = CopyBlockTemplate(blockTemplates.responseList);
	console.log(response);
	for(let i = 0; i < participants.length; i++) {
		response.splice(1,0,
			{
				"type":"section",
				"text": {
					"type":"mrkdwn",
					"text": ":heavy_check_mark: " + participants[i].response
				}
			}
		);
	}
	PostMessage("messages", homeChannel, response);
}
		
function AddParticipant(userId, userName) {
	for(let i =0; i < participants.length; i++) {
		if(participants[i].id == userId) {
			return;
		}
	}
	participants.push(CreateNewParticipant(userId, userName));
}
	
function CreateNewParticipant(userId,userName) {
	let newHand = [];
	for(let i = 0; i < 5; i++) {
		let newCard = contentManager.DrawReactionCard();
		while(newHand.indexOf(newCard) > -1) {
			newCard = contentManager.DrawReactionCard();
		}
		newHand.push(newCard);
	}
	return {id:userId, name:userName, hand:newHand, responded:false, score:0};
}

function PickNextPicker() {
	if(participants.length == 1) return;
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
		console.log("Error finding channel ID");
		console.log(e);
	}
}

function RecordInteraction(actionString, userName, otherInfo) {
	let newInteraction = {action:actionString, user:userName, misc: ""};
	if(otherInfo != null) newInteraction.misc = otherInfo;

	interactions.push(newInteraction);
}

async function PostMessage(message, targetChannel, blockJson) {
	let args = {text:message, channel:targetChannel, blocks:blockJson};
	queuedMessages.push({isEphemeral:false, msgArgs:args});
}

async function PostEphemeral(message, targetChannel, targetUser, blockJson) {
	let args = {text:message, channel:targetChannel, user:targetUser, blocks:blockJson, attachments:null};
	console.log(args);
	queuedMessages.push({isEphemeral:true, msgArgs:args});
}

function UpdateEphemeralMessage(response_url, newText) {
	axios.post(response_url, {
			"replace_original":"true",
			"text": newText 
		}).then(function (response) {
			//console.log(response);
		}).catch(function (error) {
			console.log("Error updating ephemeral message");
			console.log(error);
		});
}

function DeleteEphemeralMessage(response_url) {
	axios.post(response_url, {
			"delete_original":"true"
		}).then(function(response) {
			//console.log(response);
		}).catch(function (error) {
			console.log("Error deleting ephmeral message");
			console.log(error);
		});
}

async function OpenModal(triggerId, modal) {
	let args = {trigger_id:triggerId, view:modal}
	try {
		const res = await web.views.open(args);
		console.log("opened modal");
		//console.log(res);
	} catch(e) {
		console.log("Error opening modal");
		console.log(e);
	}
};

function CopyBlockTemplate(targetTemplate) {
	return JSON.parse(JSON.stringify(targetTemplate));
}

function RoundNumber() {
	let count = 0;
	participants.forEach(function(player) { count += player.score;});
	return count;
}

function Sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
