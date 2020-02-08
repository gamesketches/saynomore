const {createEventAdapter} = require('@slack/events-api');
const {WebClient} = require('@slack/web-api');
const {createMessageAdapter} = require('@slack/interactive-messages');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

const slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);

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

let gameStatus = "idle";
let participants = [];
let homeChannel = "";
let cards = [
	"Your crush gave you a new phone. Now you can share secret text messages and pictures just between you two.",
	"The guy you have a big crush is on is having money problems. He needs your help and asks you for a favor.",
	"The person you're dating gies you a bracelet and you have no idea why.",
	"Porn pops up on your boyfriend's computer."];

let reactions = [
	"lol", "no way", "that's whacky", "Stay quiet"];

async function PostMessage(message, targetChannel, blockJson) {
	let args = {text:message, channel:targetChannel, blocks:blockJson};
	try {
		const res = await web.chat.postMessage(args);
		console.log(res);
	} catch(e) {
		console.log(e);
	}
}

slackInteractions.action({type:'message_action' }, (payload, respond) => {
	console.log("payload", payload);
});

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
    ' instructions in the README to configure the Slack App and your environment variables.</p>');
});


async function StartGame(channel, starter) {
	let joinBlock = 
		[
			{
				"type":"section",
				"text": {
					"type":"plain_text",
					"text":"Who wants to play Say No More? Emoji react to join"
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
		await PostMessage("Click to begin", starter, startBlock);
	} catch(e) {
		console.log(e);
	}
	
	gameStatus = "joining";
};

async function BeginGame() {
	console.log("num participants " + participants.length);
	for(let i = 0; i < participants.length; i++) {
		participants[i] = CreateNewParticipant(participants[i]);
		console.log(participants[i]);
	}
	gameStatus = "playing";
	CreateNewEventPrompt();
}


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
	
	if(payload.actions[0].value == "click_begin") {
		gameStatus = "playing";
		BeginGame();
	} else if(payload.actions[0].value == "click_join") {
		participants.push(payload.user.id);
	} else if(gameStatus == "playing") {
		for(let i = 0; i < participants.length; i++) {
			if(participants[i].id == payload.user.id) {
				participants[i].response = payload.actions[0].value;
				participants[i].responded = true;
				break;
			}
		}
		let allResponded = true;
		for(let i = 0; i < participants.length; i++) {
			if(!participants[i].responded) {
				allResponded = false;
			}
		}
		if(allResponded) {
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

(async () => {

	const server = app.listen(3000);

	console.log("server up at ", server.address());
})();

function CreateNewEventPrompt() {
	let eventPrompt = cards[Math.floor(cards.length * Math.random())];
	let promptBlock = [
	{
		"type": "section",
		"text": {
				"type": "plain_text",
				"text": eventPrompt
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
			PostMessage(eventPrompt, player.id, promptBlock);
		} catch(e) {
			console.log(e);
		}
	}
}

function CreateNewParticipant(userId) {
	let newHand = [];
	for(let i = 0; i < 5; i++) {
		newHand.push(reactions[Math.floor(Math.random() * reactions.length)]);
	}
	console.log(newHand);
	return {id:userId, hand:newHand, responded:false};
}
