const config = require('../../config/default.json');

const PAGE_ACCESS_TOKEN = config.pageAccessToken;

const request = require('request');

exports.processAnalysis = processAnalysis;
exports.sendTextMessage = sendTextMessage;

  /*
   * Will be passed a single analysis object for a file.
   * If file reached here, guranteed that file had at least 1 instance of possible sensitive info.
   * @input: Single (1) analysis object
   * @output: sent message.
   */
  function processAnalysis(analysis){
    sendTextMessage("Your file: " + analysis.name + " might include some sensitive information. A complete report is below:\n\n");
    sendImageMessage(); // pdf
    sendTypingOn();

    setTimeout(function (){

    // Credit Card
    sendTypingOn();
    setTimeout(function (){
      sendTextMessage(analysis.possible_credit_card.instances + " possible instances of credit card information \n");
    }, 4000);

    // SSN
    sendTypingOn();
    setTimeout(function (){
      sendTextMessage(analysis.possible_ssn.instances + " possible instances of SSN information \n");
    }, 8000);

    // fin
    sendTypingOn();
    setTimeout(function (){
      sendTextMessage(analysis.possible_financial.instances + " possible instances of financial information \n");
    }, 12000);

    // phone
    sendTypingOn();
    setTimeout(function (){
      sendTextMessage(analysis.possible_phone.instances + " possible instances of phone information \n");
    }, 16000);

    // address
    sendTypingOn();
    setTimeout(function (){
      sendTextMessage(analysis.possible_address.instances + " possible instances of personal (address) information");
    }, 20000);


    }, 5000);

    // sendTypingOff();

  }

  /*
   * Send a text message using the Send API.
   *
   */
  function sendTextMessage(messageText) {
    console.log('got to text message: ' + messageText);
    var messageData = {
      recipient: {
        id: '1189479574416446' // Hard-coded to my MiD.
      },
      message: {
        text: messageText
      }
    };

    callSendAPI(messageData);
  }

  /*
 * Turn typing indicator on
 *
 */
function sendTypingOn() {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: "1189479574416446"
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff() {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: "1189479574416446"
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage() {
  var messageData = {
    recipient: {
      id: "1189479574416446"
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          text: "hi",
          url: "http://forums.windowscentral.com/attachments/microsoft-surface-pro-2/51125d1386092035t-screenshot-1-.png" // HackWeek PDF Preview.
        }
      }
    }
  };

  callSendAPI(messageData);
}


function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error(response.error);
    }
  });  
}