AWS.config.region = 'us-east-2';
var IDENTITYPOOLID = 'us-east-2:d25f8632-adf0-4b5f-a263-0520438fef64';

var credentialKeys = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken'
];

// When page loads, check to see if credentials
// - are saved for the session. If so, refresh and
// - continue to next page.
$(window).load(function() {
  var loggedIn = true;
  credentialKeys.forEach(function(key) {
    if (sessionStorage.getItem(key) == null) {
      loggedIn = false;
    }
  });
  if (!loggedIn) {
    console.log('Currently not logged in.');
  } else {
    console.log('Stored credentials were found, verifying.');

    // Load the credentials
    credentialKeys.forEach(function(key) {
      AWS.config.credentials[key] = sessionStorage.getItem(key);
    });

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
      }
    });
  }
});



// This function is called by other scripts once
// - they have successfully logged in with Cognito
function loginSaveCognitoCredentials() {
  credentialKeys.forEach(function(key) {
    sessionStorage.setItem(key, AWS.config.credentials[key]);
  });
  sessionStorage.setItem('region', AWS.config.region);

  console.log('Credentials saved, ready for segue to next page!');
}
