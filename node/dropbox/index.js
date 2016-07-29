const Dropbox = require('dropbox');

const config = require('../../config/default.json');

exports.init = init;
exports.filesListFolder = filesListFolder;
exports.getTempLink = getTempLink;

var dbx; // dropbox obj.

// Constructor
function init(){
	console.log('init called. ' + config.dbaccesstoken);
	dbx = new Dropbox({ accessToken: config.dbaccesstoken })
}

/*
 * Dropbox function that returns the files from a given path.
 * @input: (String) path
 * @output: (Promise) response
 */
function filesListFolder(path, recursive){
	return dbx.filesListFolder({path: path, recursive: recursive}); 
}

// download not yet a supported endpoint, get temp. URL and then download.
// function download(path){
// 	return dbx.download(path);
// }

function getTempLink(path){
	 return dbx.filesGetTemporaryLink({path: path});
}

