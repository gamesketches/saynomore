const {createEventAdapter} = require('@slack/events-api');
const {WebClient} = require('@slack/web-api');
const {createMessageAdapter} = require('@slack/interactive-messages');


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
let baseChannel = null;
let curGameCards = [];
let curCard = null;
let allCards = [
	"Your crush gave you a new phone. Now you can share secret text messages and pictures just between you two.",
	"The guy you have a big crush is on is having money problems. He needs your help and asks you for a favor.",
	"The person you're dating gies you a bracelet and you have no idea why.",
	"Porn pops up on your boyfriend's computer."];
let responses = {};



async function PostMessage(message, targetChannel, blockJson) {
	let args = {text:message, channel:targetChannel, blocks:blockJson};
	try {
		const res = await web.chat.postMessage(args);
	} catch(e) {
		console.log(e);
	}
}

slackEvents.on('message.im', (event) => {
	console.log("message im event");
	console.log(event);
});

slackEvents.on('message', (event) => {
	let words = event.text.split();
	console.log(event);
	if(gameStatus == "playing" && event.channel_type == "im") {
		responses[event.user] = event.text;
		console.log("responses:" + responses);
		if(AllResponded()) {
			PostResponses();
		}
	} else {
		for(let i = 0; i < words.length; i++) {
			if(words[i] == "play") {
				if(gameStatus == "idle") {
					try {
						StartGame(event.channel, event.user);
					} catch(e) {
						console.log(e);
					}
					break;
				} else if(gameStatus == "joining") {
					participants.push(event.user);
					console.log("participants:" + participants);
					try {
						PostMessage("You're in!", event.user);
					} catch(e) {
						console.log(e);
					}
				}
				break;
			}
			if(words[i] == "start" && gameStatus == "joining") {
				gameStatus = "playing";
				try {
					GameRound();
				} catch(e) {
					console.log(e);
				}
			} else {
				console.log(words[i]);
				console.log(gameStatus);
			}
		}
	}
});

slackEvents.on('reaction_added', (event) => {
	console.log("reaction event received");
});

async function StartGame(channel, starter) {
	/*let ctaBlock = 
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
	}*/
	gameStatus = "joining";
	baseChannel = channel;
	curGameCards = [...allCards];
	try {
		await PostMessage("say play to join", channel);
	} catch(e) {
		console.log(e);
	}
};

async function GameRound() {
	console.log("Entered GameRound()");
	curCard = curGameCards[0];
	for(let i =0; i < participants.length; i++) {
		 responses[participants[i]] = null;
		 console.log(participants[i]);
		 try {
			PostMessage(curCard, participants[i]);
		} catch(e) {
			console.log(e);
		} 
	}
}

(async () => {

	const server = await slackEvents.start(3000);

	console.log("server up");
})();


function AllResponded() {
	console.log("Entered AllResponded");
	let keys = Object.keys(responses);
	console.log(keys);
	for(let i = 0; i < keys.length; i++) {
		console.log(responses[keys[i]]);
		if(!responses[keys[i]]) {
			return false;
		}
	}
	return true;
}

function PostResponses() {
	console.log("Entered PostResponses");
	let values = Object.values(responses);
	let returnVal = "With a prompt of: \n" + curCard + "\n Here are the respones \n";
	for(let i=0; i< values.length; i++) {
		returnVal += values[i] + "\n";
	}
	Object.keys(responses).forEach(key=> {
			responses[key] = null;
	});
	try{
		PostMessage(returnVal, baseChannel);
		GameRound();
	} catch(e) {
		console.log(e);
	}
}
