var APPNAME = 'https://s3.us-east-2.amazonaws.com/insta-analysis-project'

var identityType = '';
var credentialKeys = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken'
];

// If not logged in, redirect to login page
function redirectToNotLoggedIn() {
  window.location = APPNAME + '/login.html';
}

// When page loads, check to see if credentials
// - are saved for the session. If so, refresh and
// - continue. If not, clear them and send to login.
$(window).on('load', function() {
  var loggedIn = true;
  credentialKeys.forEach(function(key) {
    if (sessionStorage.getItem(key) == null) {
      loggedIn = false;
    }
  });
  if (sessionStorage.getItem('region') == null) {
    loggedIn = false;
  }
  if (sessionStorage.getItem('type') == null) {
    loggedIn = false;
  }
  if (!loggedIn) {
    console.log('Currently not logged in.');
    redirectToNotLoggedIn();
  } else {
    console.log('Stored credentials were found, verifying.');

    // Load the credentials
    AWS.config.credentials = new AWS.Credentials();
    credentialKeys.forEach(function(key) {
      AWS.config.credentials[key] = sessionStorage.getItem(key);
    });
    AWS.config.region = sessionStorage.getItem('region');
    identityType = sessionStorage.getItem('type');

    // Verify the credentials are valid
    AWS.config.credentials.get(function(err) {
      if (err) {
        console.log(err);
        console.log('Unable to refresh credentials, clearing session storage.');
        credentialKeys.forEach(function(key) {
          sessionStorage.removeItem(key);
        });
        redirectToNotLoggedIn();
      } else {
        console.log('Credentials successfully loaded and/or refreshed.');
      }
    });
  }
});

$(window).on('load', function() {
  document.getElementById('logout').onclick = function() {

    // Clear AWS credentials
    AWS.config.credentials = null;

    // Clear sessionStorage
    credentialKeys.forEach(function(key) {
      sessionStorage.removeItem(key);
    });
    sessionStorage.removeItem('type');
    sessionStorage.removeItem('region');

    // Call individual logout functions
    switch(identityType) {
      case 'Facebook':
        facebookLogout();
        break;
      case 'Amazon':
        amazonLogout();
        break;
      case 'InstaAnalytics':
        instaAnalyticsLogout();
        break;
      default:
        break;
    }
  }
});
