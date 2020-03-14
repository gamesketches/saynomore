exports.joinBlock = [   
 {   
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
   }
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
