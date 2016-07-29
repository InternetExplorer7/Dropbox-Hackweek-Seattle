const watson = require('watson-developer-cloud');
// const tesseract = require('node-tesseract');
const fs = require('fs');

const request = require('request');

const Promise = require('bluebird');

const config = require('../../config/default.json');


exports.document_conversion = watson_document_conversion;

function watson_document_conversion(entryWithTemp) {

	return new Promise(function (resolve, reject){

		console.log('current temp link: ' + entryWithTemp);

		const _tempURL = entryWithTemp.link;

		var obj = {
			name: entryWithTemp.metadata.name,
			text: ""
		};

		var document_conversion = watson.document_conversion({
		  username:     config.ibm_user,
		  password:     config.ibm_pass,
		  version:      'v1',
		  version_date: '2015-12-15'
		});

		// convert a document
		document_conversion.convert({
		  // (JSON) answer_units, normalized_html, or normalized_text
		  file: request(_tempURL),
		  conversion_target: 'answer_units'
		  // Add custom configuration properties or omit for defaults
		}, function (err, response) {
		  if (err) {
		    console.error(err);
		    reject(err);
		  } else {
		    console.log('text: --> ' + response.answer_units[0].content[0].text);
		    obj.text = response.answer_units[0].content[0].text;
		    resolve(obj);
		  }
		});
	});
}