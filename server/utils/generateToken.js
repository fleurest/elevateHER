require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');
const open = require('open');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const app = express();

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code found in query.');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    console.log('\nAccess + Refresh Token:\n');
    console.log(JSON.stringify(tokens, null, 2));

    res.send('Success - You can close this window.');
  } catch (err) {
    console.error('Error retrieving token:', err);
    res.send('Error retrieving token. Check the terminal.');
  }
});

app.listen(3000, async () => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\nOpening browser for Google OAuth...');
  await open(authUrl);
});
