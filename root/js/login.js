var APPNAME = 'https://s3.us-east-1.amazonaws.com/image-analysis-project'
AWS.config.region = 'us-east-2';
var IDENTITYPOOLID = 'us-east-2:d25f8632-adf0-4b5f-a263-0520438fef64';

var credentialKeys = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken',
  'identityId'
];

// Once logged in, redirect to logged in view
function redirectToLoggedIn() {
  window.location = APPNAME + '/index.html';
}

// When page loads, check to see if credentials
// - are saved for the session. If so, refresh and
// - continue to next page.
$(window).on('load', function() {
  var loggedIn = true;
  credentialKeys.forEach(function(key) {
    if (sessionStorage.getItem(key) == null) {
      loggedIn = false;
    }
  });
  if (sessionStorage.getItem('type') == null) {
    loggedIn = false;
  }
  console.log('Logged in: ' + loggedIn);
  if (!loggedIn) {
    console.log('Currently not logged in.');
  } else {
    console.log('Stored credentials were found, verifying.');

    // Load the credentials
    AWS.config.credentials = new AWS.Credentials();
    credentialKeys.forEach(function(key) {
      AWS.config.credentials[key] = sessionStorage.getItem(key);
    });
    identityType = sessionStorage.getItem('type');

    // Verify the credentials are valid
    AWS.config.credentials.get(function(err) {
      if (err) {
        console.log(err);
        console.log('Unable to refresh credentials, clearing session storage.');
        credentialKeys.forEach(function(key) {
          sessionStorage.removeItem(key);
        });
      } else {
        console.log('Credentials successfully loaded and/or refreshed.');
        redirectToLoggedIn();
      }
    });
  }
});

// This function is called by other scripts once
// - they have successfully logged in with Cognito
function loginSaveCognitoCredentials(type) {
  credentialKeys.forEach(function(key) {
    sessionStorage.setItem(key, AWS.config.credentials[key]);
  });
  sessionStorage.setItem('region', AWS.config.region);
  sessionStorage.setItem('type', type);

  console.log('Credentials saved, ready for segue to next page!');
  redirectToLoggedIn();
}
