var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './routes/token.json';
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */

var rows;
function listMajors(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '12CX-tnVCxut1ZaplzHTi5-gIeEkO5asbb4C6LKh93dg',
    range: ['summary!A:G']
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    rows = [];
    for (i = 0; i < res.data.values.length; i++) {
      if (res.data.values[i][1] == checkID) {
        rows = [(res.data.values[i])];
      }
    };
  });
}

var projects;
function listProjects(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '1TmGdSP5W81fdZ6mGcr3YRP1xMBd4nVMyYo4n3I2BgNk',
    range: ['projectSummary!A:G']
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    projects = [];
    for (i = 0; i < res.data.values.length; i++) {
      projects.push(res.data.values[i][1]);
    };
  });
}


// Load client secrets from a local file.
var checkID;
router.post('/check', function (req, res, next) {
  checkID = (req.body).barcode;
  res.redirect('/item');
});


router.get('/item', function (req, res, next) {
  fs.readFile('./routes/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), listMajors);
    authorize(JSON.parse(content), listProjects);
  });
  setTimeout(function () {
    res.render('item', { page: 'Home', menuId: 'home', rows: rows, projects: projects })
      ;
  }, 2000);

});

//////////////////////////////////////////////////////////////////////////////////////////////
var requestProject;
var requestQuantity;
var requestRequestor;
var requestDate;
var requestUrgent;

function request(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  let values = [[rows[0][1], rows[0][2], requestProject, requestQuantity, requestRequestor,requestDate,requestUrgent]];
  let resource = {
    values,
  };
  sheets.spreadsheets.values.append({
    spreadsheetId: '12CX-tnVCxut1ZaplzHTi5-gIeEkO5asbb4C6LKh93dg',
    range: 'request!A:F',
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
  });
}

router.post('/request', function (req, res, next) {

  requestProject = (req.body).project;
  requestQuantity = (req.body).quantity;
  requestRequestor = (req.body).requestor;
  requestDate=(req.body).deliveryDate;
  requestUrgent = (req.body).urgent;


  fs.readFile('./routes/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), request);
    res.redirect('/');
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////


module.exports = router;


