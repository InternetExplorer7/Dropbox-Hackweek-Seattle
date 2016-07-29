const express = require('express');

const app = express();

const bodyParser = require('body-parser');

const dropbox = require('./dropbox');

const Watson = require('./watson');

const request = require('request');

const uuid = require('node-uuid');

const Promise = require('bluebird');

const fs = require('fs');

const natural = require('natural');  

const randomWord = require('random-word');

const Facebook = require('./Facebook');

const rn = require('random-number');

const config = require('../config/default.json');


dropbox.init();


// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}));

// Process application/json
app.use(bodyParser.json());


// Dummy webhook for Messenger confirmations.
app.get('/mwebhook', function(req, res) {
  console.log('request recieved..');
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === config.pageAccessToken) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }  
});

app.post('/mwebhook', function (req, res){
	res.sendStatus(200);
})

// Dropbox challenge webhook
app.get('/webhook', function (req, res) {
	res.send(req.query['challenge']);
});	

// Event listener
app.post('/webhook', function (req, res) {
	console.log('request: ' + JSON.stringify(req.body));
	dropbox.filesListFolder('', true) // path, recursive [Should always be true.]
		.then(function (response){
			return response.entries; // Array of all folders and files.
		})
		.then(function (entries) { // Native Promises doesn't have a `filter` method, recreate.
			return entries.filter(filterByTag)
		})
		.then(function (filesArray){
			OCR(filesArray);
		})
		.catch(function (err) {
			console.error(err);
		});
	res.sendStatus(200);
});

/*
 * @input: Array of Entry objects. (PDF only)
 * add temp URL to object.
 */
function OCR(filesEntries){
	var newArr;
	// Creates a new array and uses same object.
	// Only difference is new field, which holds PDF URL.
	Promise.try(function (){
		return filesEntries;
	}).map(function (entry) {
		// Will transform array to include temp (4 hrs) URLs.
		return dropbox.getTempLink(entry['path_display']);
	}).map(function (entryWithTemp){
		// Same array but now with temp URL (4 hrs)
		// Transform array for elements with response obj.

		return Watson.document_conversion(entryWithTemp);
	}).map(function (newEntry){
		// New objects: { name: <filename>, text: <ocr>}
		// The beef of application; detect sensitive data.
		return riskAnalysis(newEntry);
	}).filter(function (file){
		if (file.clean) {
			// File is clean, no need to do anything, remove.
			return false;
		} else {
			// File may include sensitive information, keep.
			return true;
		}
	}).then(function (compromisedFiles){
		var amountCompromised = compromisedFiles.length;
		console.log(amountCompromised + " uploaded file(s) includes sensitive information.");

		if (amountCompromised < 1){
			// No files compromised.
			// Notify FB user.
			Facebook.sendTextMessage('Checked, and double checked. All your files look clean!')
		} else {
			// Loop through caught into and send to user via FB Messenger.
			compromisedFiles.forEach(function (file){
				Facebook.processAnalysis(file);
			});
		}
	});
}


function riskAnalysis(entry){
	var analysis = {
		name: entry.name,
		clean: true,
		possible_credit_card: {
			instances: 0
		},
		possible_ssn: {
			instances: 0
		},
		possible_financial: {
			instances: 0
		},
		possible_phone: {
			instances: 0
		},
		possible_address: {
			instances: 0
		},
		possible_names: {
			instances: 0
		}
		// Can add more later.
	}
	// return new Promise(function (resolve, reject){
		var text = entry.text;

		var words = text.split(" "); // Split into array of all words. e.g. ['hello', 'cat', 'dog', 'jumped']

		// credit_card('yeah', analysis);

		for (var i = 0; i < words.length; i++) {

			var word = words[i];


			analysis = credit_card(word, analysis);

			analysis = ssn(word, analysis);

			analysis = financial(word, analysis);

			analysis = phone(word, analysis);

			analysis = address(word, analysis);
		}

		console.log("new analysis object: " + JSON.stringify(analysis));
		return analysis;

}

function credit_card(text, analysis) {
	var classifier = new natural.BayesClassifier();

	classifier.addDocument('9404-3992-9938-9928', 1);
	classifier.addDocument('2817-2392-1884-9938', 1);
	classifier.addDocument('4323-4332-6657-9986', 1);
	classifier.addDocument('2345-5122-4345-8765', 1);
	classifier.addDocument('4322-9987-5433-5436', 1);
	classifier.addDocument('6543-1234-7655-8765', 1);
	classifier.addDocument('4322-6554-7765-4553', 1);
	classifier.addDocument('8876-5433-4321-7786', 1);
	classifier.addDocument('4322-5466-9643-5432', 1);
	classifier.addDocument('8949-4883-2881-1123', 1);
	classifier.addDocument('8387-3882-1882-8834', 1);
	classifier.addDocument('4882-4701-0943-9382', 1);
	classifier.addDocument('3827-3727-3332-4345', 1);
	classifier.addDocument('8484-1274-2883-6994', 1);
	classifier.addDocument('3882-6831-0912-0732', 1);


	classifier.addDocument('8904-4323-6554-4332', 1);
	classifier.addDocument('0987-7654-4322-1234', 1);
	classifier.addDocument('5432-5432-7776-4223', 1);
	classifier.addDocument('5443-2432-4321-1112', 1);
	classifier.addDocument('3214-1321-1421-5436', 1);
	classifier.addDocument('7621-9653-1234-5567', 1);
	classifier.addDocument('1111-2222-3333-4444', 1);
	classifier.addDocument('4444-5555-6666-7777', 1);
	classifier.addDocument('5555-6666-7777-8888', 1);
	classifier.addDocument('9999-9999-9999-9999', 1);
	classifier.addDocument('1111-2222-3333-4444', 1);
	classifier.addDocument('2222-3333-4444-5555', 1);
	classifier.addDocument('1122-4333-4223-6654', 1);
	classifier.addDocument('9384-3994-1993-2993', 1);
	classifier.addDocument('4938-2993-4993-2993', 1);

	// add random words
	trainRandomWords(classifier, 400);

	// train
	classifier.train();

	// decision
	var is_card = classifier.classify(text);

	// convert from String to Int.
	is_card = parseInt(is_card)

	// Is a card
	if (is_card === 1) {
		console.log('isCard');
		analysis.possible_credit_card.instances++;
		analysis.clean = false;
	}

	return analysis;
}

function ssn(text, analysis) {
	var classifier = new natural.BayesClassifier();

	classifier.addDocument('886-29-3923', 1);
	classifier.addDocument('958-39-2994', 1);
	classifier.addDocument('847-98-2830', 1);
	classifier.addDocument('992-94-2994', 1);
	classifier.addDocument('849-39-1992', 1);
	classifier.addDocument('775-95-9932', 1);
	classifier.addDocument('788-99-2838', 1);
	classifier.addDocument('833-29-3004', 1);
	classifier.addDocument('996-43-6543', 1);
	classifier.addDocument('877-53-7665', 1);
	classifier.addDocument('800-57-1123', 1);
	classifier.addDocument('901-65-2447', 1);
	classifier.addDocument('999-00-1102', 1);
	classifier.addDocument('966-12-1422', 1);
	classifier.addDocument('849-00-3499', 1);

	// Add random words
	trainRandomWords(classifier, 400);

	// Train
	classifier.train();

	// decision
	var is_ssn = classifier.classify(text);

	// convert from String to Int.
	is_ssn = parseInt(is_ssn);

	if (is_ssn === 1) {
		analysis.possible_ssn.instances++;
		analysis.clean = false;
	}

	return analysis;
}

function financial(text, analysis) {
	var classifier = new natural.BayesClassifier();

	classifier.addDocument('400,000', 1);
	classifier.addDocument('$3943', 1);
	classifier.addDocument('$4,120', 1);
	classifier.addDocument('$929,499.00', 1);
	classifier.addDocument('$33.00', 1);
	classifier.addDocument('$9330', 1);
	classifier.addDocument('$1,336', 1);
	classifier.addDocument('$', 1);
	classifier.addDocument('$400', 1);
	classifier.addDocument('$9,000', 1);
	classifier.addDocument('$4.50', 1);
	classifier.addDocument('$44.00', 1);
	classifier.addDocument('$4.21', 1);
	classifier.addDocument('$40,000', 1);
	classifier.addDocument('$5,000', 1);
	classifier.addDocument('$958', 1);
	classifier.addDocument('$3930', 1);
	classifier.addDocument('$4,120', 1);
	classifier.addDocument('$212,288.00', 1);
	classifier.addDocument('$33.56', 1);
	classifier.addDocument('$392,200', 1);
	classifier.addDocument('$1,33', 1);
	classifier.addDocument('$3.55', 1);
	classifier.addDocument('$400.33', 1);
	classifier.addDocument('$12,000', 1);
	classifier.addDocument('$3.50', 1);
	classifier.addDocument('$4.00', 1);
	classifier.addDocument('$4.21', 1);
	classifier.addDocument('$0', 1);
	classifier.addDocument('$938,000', 1);

	// Add random words
	trainRandomWords(classifier, 400);

	// Train
	classifier.train();

	// decision
	var is_fin = classifier.classify(text);

	// convert from String to Int.
	is_fin = parseInt(is_fin);

	if (is_fin === 1) {
		analysis.possible_financial.instances++;
		analysis.clean = false;
	}

	return analysis;
}

function phone(text, analysis){
	var classifier = new natural.BayesClassifier();

	classifier.addDocument('425-393-4933', 1);
	classifier.addDocument('334-339-2993', 1);
	classifier.addDocument('399-223-2294', 1);
	classifier.addDocument('425-239-2934', 1);
	classifier.addDocument('206-293-1123', 1);
	classifier.addDocument('206-293-1112', 1);
	classifier.addDocument('425-295-2993', 1);
	classifier.addDocument('425-339-3342', 1);
	classifier.addDocument('399-299-4992', 1);
	classifier.addDocument('399-399-1112', 1);
	classifier.addDocument('800-493-9987', 1);
	classifier.addDocument('993-229-9943', 1);
	classifier.addDocument('425-238-1123', 1);
	classifier.addDocument('199-339-4993', 1);
	classifier.addDocument('425-644-3349', 1);

	// Add random words
	trainRandomWords(classifier, 400);

	// Train
	classifier.train();

	// decision
	var is_phone = classifier.classify(text);

	// convert from String to Int.
	is_phone = parseInt(is_phone);

	if (is_phone === 1) {
		analysis.possible_phone.instances++;
		analysis.clean = false;
	}

	return analysis;
}

function address(text, analysis){
	var classifier = new natural.BayesClassifier();

	classifier.addDocument('location', 1);
	classifier.addDocument('address', 1);
	classifier.addDocument('place', 1);
	classifier.addDocument('loc', 1);
	classifier.addDocument('here', 1);

	// Add random words
	trainRandomWords(classifier, 400);

	// Train
	classifier.train();

	// decision
	var is_loc = classifier.classify(text);

	// convert from String to Int.
	is_loc = parseInt(is_loc);

	if (is_loc === 1) {
		analysis.possible_address.instances++;
		analysis.clean = false;
	}

	return analysis;
}

/*
 * Adds random words to classifier.
 * @input: classifier, length of loop
 * @output: stronger classifier.
*/
function trainRandomWords(classifier, limit){
	for(var i = 0; i < limit; i++){
		classifier.addDocument(randomWord());
	}
}

function filterByTag(entry){
	// For this Hackathon, only files checked with be PDFs
	if(entry['.tag'] === 'folder' || !(entry.name.includes('.pdf'))) {
		return false;
	} else {
		return true;
	}
}

app.listen(3000);