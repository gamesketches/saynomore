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
	let ctaBlock = 
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
					"value": "join"
				}
		  }
		];	
	try {
		await PostMessage("Click to join", channel, ctaBlock);
	} catch(e) {
		console.log(e);
	}
	gameStatus = "joining";
};

async function BeginGame() {
	let ctaBlock = [
	{
		"type": "actions",
		"elements": [
			{
				"type": "button",
				"text": {
					"type": "plain_text",
					"emoji": true,
					"text": "Approve"
				},
				"style": "primary",
				"value": "click_me_123"
			},
			{
				"type": "button",
				"text": {
					"type": "plain_text",
					"emoji": true,
					"text": "Deny"
				},
				"style": "danger",
				"value": "click_me_123"
			}
		]
		}
	] 
	for(let i = 0; i< participants.length; i++) {
		 try {
			await PostMessage("Click to join", participants[i], ctaBlock);
		} catch(e) {
			console.log(e);
		}
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
	
	const payload = JSON.parse(req.body.payload);
	console.log(payload);
	//participants.push(payload.user.id);
	if(gameStatus == "playing") {
		CreateNewEventPrompt();
	} else {
		gameStatus = "playing";
		BeginGame();
	} 
	res.send('');
});

app.post('/saynomore', (req, res) => {
	console.log("say no more post");
	
	homeChannel = req.body.channel_id;
	res.send('Starting game');
	StartGame(req.body.channel_id);
	console.log(req.body);
});

(async () => {

	//const server = await slackInteractions.start(3000);
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
	for(let i = 0; i < reactions.length; i++) {
		promptBlock[1].elements.push( {
				"type": "button",
				"text": {
					"type": "plain_text",
					"emoji": true,
					"text": reactions[i] 
				},
				"value": "click_me_123"
			});
		}
	try {
		PostMessage(eventPrompt, homeChannel, promptBlock);
	} catch(e) {
		console.log(e);
	}
}
