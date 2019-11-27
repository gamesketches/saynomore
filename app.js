const { App } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

let options = ["yay","nay","hooray"];

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
		response.blocks.push( 
			{
			"type":"section",
			"text": {
				"type":"plain_text",
				"text": "Will you choose " + options[i] + "?"
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": options[i]
				},
				"action_id": "play_click",
				"value": options[i]
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
	console.log(options.indexOf(body.actions[0].value));
	if(diceroll == options.indexOf(body.actions[0].value)) {
		say(`wise choice <@${body.user.id}>`);
		points += 1;
	} else {
		say(`sorry bub`);
	}
	say(`You have ${points} points`);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
