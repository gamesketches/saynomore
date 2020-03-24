exports.joinBlock = [   
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Let's play Say No More :wave:"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "What's normal in a healthy romantic realtionship? Find out what your friends think"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "• Your responses will be anonymous unless you win a round. \n • You will also get a chance to pick the winner of a round. \n • Ready to play?"
				}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Confidentiality (or other mindset/agreement) is really important when playing. Click the button below to confirm you'll play by the rules:"
				}
		},
		{
		"type": "actions",
		"elements": [
		{
			"type": "button",
			"text": {
				"type": "plain_text",
				"text": "I agree to confidentiality.",
				"emoji": true
				},
			"action_id": "click_join",
			"value": "click_join"
			}
		]
	}
/* {   
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
   }*/
 ];

exports.beginBlock = [
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
exports.enterModal = 
	{
	"type": "modal",
	"title": {
		"type": "plain_text",
		"text": "Make your own prompt",
		"emoji": true
	},
	"submit": {
		"type": "plain_text",
		"text": "Submit",
		"emoji": true
	},
	"close": {
		"type": "plain_text",
		"text": "Cancel",
		"emoji": true
	},
	"blocks": [
		{
			"type": "divider"
		},
		{
			"type": "input",
			"label": {
				"type": "plain_text",
				"text": "Write about a tough situation you found yourself in",
				"emoji": true
			},
			"element": {
				"type": "plain_text_input",
				"multiline": true
			}
		}
	]
};

exports.enterResponseModal = 
	{
	"type": "modal",
	"title": {
		"type": "plain_text",
		"text": "Make your own response",
		"emoji": true
	},
	"submit": {
		"type": "plain_text",
		"text": "Submit",
		"emoji": true
	},
	"close": {
		"type": "plain_text",
		"text": "Cancel",
		"emoji": true
	},
	"blocks": [
		{
			"type": "divider"
		},
		{
			"type": "input",
			"label": {
				"type": "plain_text",
				"text": "Respond to the prompt below",
				"emoji": true
			},
			"element": {
				"type": "plain_text_input",
				"multiline": true
			}
		}
	]
};
