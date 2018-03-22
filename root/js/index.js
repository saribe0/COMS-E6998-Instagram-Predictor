var credentialKeys = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken'
];

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
  if (!loggedIn) {
    console.log('Currently not logged in.');
    redirectToNotLoggedIn();
    window.location.replace = '../login.html';
  } else {
    console.log('Stored credentials were found, verifying.');

    // Load the credentials
    credentialKeys.forEach(function(key) {
      AWS.config.credentials[key] = sessionStorage.getItem(key);
    });
    AWS.config.region = sessionStorage.getItem('region');

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

// If not logged in, redirect to login page
function redirectToNotLoggedIn() {
  window.location.replace = '../login.html';
}
