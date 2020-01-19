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

async function PostMessage(message, targetChannel, blockJson) {
	let args = {text:message, channel:targetChannel, blocks:blockJson};
	console.log(args.blocks);
	try {
		const res = await web.chat.postMessage(args);
	} catch(e) {
		console.log(e);
	}
}

slackEvents.on('message', (event) => {
	let words = event.text.split();
	for(let i = 0; i < words.length; i++) {
		if(words[i] == "play") {
			try {
				StartGame(event.channel, event.user);
			} catch(e) {
				console.log(e);
			}
			break;
		}
	}
});

slackInteractions.action({"click_join",(payload, respond) => {
	console.log(payload);
});

async function StartGame(channel, starter) {
	let ctaBlock = 
		[
			{
				"type":"section",
				"text": {
					"type":"plain_text",
					"text":"wants to play Say No More! Click here to join"
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
};


(async () => {

	const server = await slackEvents.start(3000);

	console.log("server up");
})();

