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
		{
			"type": "actions",
			"block_id": "card_block",
			"elements": []
		}
		]
	};
	for(var i = 0; i < options.length; i++) {
		response.blocks[1].elements.push( 
			{
				"type": "button",
				"action_id": "play_click",
				//"action_id": "button_click",
				"text": {
					"type": "plain_text",
					"text": options[i]
				},
				"value": "value-0" 
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

app.action('play_click', ({ack, say}) => {
	ack();
	Math.floor(Math.random() * Math.floor(max));
	say(`wise choice <@${body.user.id}>`);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
