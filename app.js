const { App } = require('@slack/bolt');

function MakeButtonCard(text) {
	returnVal = {
			"type":"section",
			"text": {
				"type":"plain_text",
				"text": "Will you choose " + text + "?"
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": text 
				},
				"action_id": "play_click",
				"value": text
			}
		};
	return returnVal;
}
// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

let options = ["yay","nay","hooray"];

let handOne = ["bloop", "bleep", "meep"];

let handTwo = ["moop", "fleep", "creep"];

let lastPick = -1;

let selections = {};

let points = 0;

app.message('play', ({message, say}) => {
	response = {blocks: [
		{
			"type":"section",
			"text": {
				"type":"mrkdwn",
				"text": `Pick a card, any card`
			},
		},
		]
	};
	for(var i = 0; i < options.length; i++) {
		response.blocks.push(MakeButtonCard(options[i]));
	}

	say(response);
	if(lastPick > -1) {
		console.log("throwin up");
		say(`${options[lastPick]}`);
	}
});

app.message('put up hands', ({message, say}) => {
	say(`Pick a card from the first hand`);
	response = {blocks: []};
	for(var i = 0; i < handOne.length; i++) {
		response.blocks.push({
			"type":"section",
			"text": {
				"type":"plain_text",
				"text": "Will you choose " + handOne[i] + "?"
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": handOne[i] 
				},
				"action_id": "hands_click_one",
				"value": handOne[i]
			}
		});
	}
	say(response);
});
		
app.message('hello', ({message, say}) => {

//	say(`Hey there <@${message.user}>!`);
	say({
		blocks: [
		{
			"type":"section",
			"text": {
				"type":"mrkdwn",
				"text": `Hey there <@${message.user}>!`
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": "Click Me"
				},
			"action_id": "button_click"
			}
		},	
		]
	});
});

app.action('button_click', ({body, ack, say}) => {
	ack();

	say(`<@${body.user.id}> clicked the button`);
});

app.action('play_click', ({body, ack, say}) => {
	ack();
	console.log(body.actions[0].value);
	let diceroll = Math.floor(Math.random() * Math.floor(options.length));
	console.log(diceroll);
	lastPick = options.indexOf(body.actions[0].value);
	console.log(lastPick);
	if(diceroll == options.indexOf(body.actions[0].value)) {
		say(`wise choice <@${body.user.id}>`);
		points += 1;
	} else {
		say(`sorry bub`);
	}
	say(`You have ${points} points`);
});

app.action('hands_click_one', ({body, ack, say}) => {
	ack();
	selections.one = body.actions[0].value;
	say(`Pick a card from the second hand`);
	response = {blocks: []};
	for(var i = 0; i < handTwo.length; i++) {
		response.blocks.push({
			"type":"section",
			"text": {
				"type":"plain_text",
				"text": "Will you choose " + handTwo[i] + "?"
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": handTwo[i] 
				},
				"action_id": "hands_click_two",
				"value": handTwo[i]
			}
		});
	}
	say(response);
});

app.action('hands_click_two', ({body, ack, say}) => {
	ack();
	selections.two = body.actions[0].value;
	say(`Okay, now pick a winner`);
	console.log(selections);
	let users = Object.keys(selections);
	response = {blocks: []};
	for(var i = 0; i < users.length; i++) {
		response.blocks.push({
			"type":"section",
			"text": {
				"type":"plain_text",
				"text": "Will you choose " + selections[users[i]] + "?"
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": selections[users[i]] 
				},
				"action_id": "hands_click_three",
				"value": selections[users[i]]
			}
		});
	}
	say(response);
});

app.action('hands_click_three', ({body, ack, say}) => {
	ack();
	say(`You picked ${body.actions[0].value}`);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
