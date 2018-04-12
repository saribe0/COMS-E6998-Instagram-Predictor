var APPNAME = 'https://s3.us-east-2.amazonaws.com/insta-analysis-project'
var apigClient = null;

var InstaClientID = 'd50144dc0378478c849bff2ae3c3abf5'
var identityType = '';
var credentialKeys = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken',
  'identityId'
];

// Sends off an API request to verify the user has valid
// instagram credentials.
function verifyInstagramConnection() {

  // Send request to AWS API Gateway to check to see if
  // the user is logged into instagram and/or has a valid
  // token. If not, display connect button. By default the
  // button is hidden.
  var body = {
    requestType: "CheckAuthentication",
    user: AWS.config.credentials.identityId
  };
  apigClient.instaPost(null, body).then(function(result) {
      console.log(result);
      // Show the login box if there was an error or authentication failed.
      // Also alert if an error was recieved.
      if (result.data.responseType == "Error") {
        window.alert(result.data.responseType + ": " + result.data.responseDetails);
        $('#login-instagram').show().css('display', 'flex');
      }
      if (result.data.authenticated == false) {
        $('#login-instagram').show().css('display', 'flex');
      }
  }).catch(function(result) {
      console.log(result);
  });
}

// If not logged in, redirect to login page
function redirectToNotLoggedIn() {
  window.location = APPNAME + '/login.html';
}

// When page loads, check to see if AWS credentials
// are saved for the session. If so, refresh and
// continue. If not, clear them and send to login.
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

        apigClient = apigClientFactory.newClient({
								accessKey: AWS.config.credentials.accessKeyId,
								secretKey: AWS.config.credentials.secretAccessKey,
								sessionToken: AWS.config.credentials.sessionToken,
								region: 'us-east-1'
							});

        // Once the API client is setup, check for any instagram
        // connection stuff.
        checkInstagramInformation();
      }
    });
  }
});

// Handle instagram login if a login code is
// in the url. Send the code to AWS through API Gateway
// to complete the authorization flow. If code is not
// in url, check for error messages and previous Insgram
// data.
function checkInstagramInformation() {

  // Run this if the url has a signature that could
  // contain the code.
  if (window.location.href.includes('?code=')) {

    // Get the potential code from the url
    var codeRaw = window.location.href.split('?');
		var code = codeRaw[1].split('=')[1];
		console.log(code);

    // Use the code to call the API Gateway to complete
    // login. All other AWS interaction will be done through
    // the API Gateway and Lambda functions.
    var body = {
      requestType: "Authenticate",
      code: code,
      user: AWS.config.credentials.identityId
    };
    apigClient.instaPost(null, body).then(function(result) {
        console.log(result);

        // If there was an error with the request, alert the user.
        if (result.data.responseType == "Error") {
          window.alert(result.data.responseType + ": " + result.data.responseDetails);

          // Continue with normal checks if failed
          verifyInstagramConnection();
        }
        // Otherwise, hide the login button and clean the url
        else {
          // Hide the connect ot instagram button
          $('#login-instagram').hide();
        }

        // Clean the url to remove the code
        window.history.pushState({}, document.title, "/insta-analysis-project/index.html" );

  	}).catch(function(result) {
        console.log(result)
  	});
  }
  // Else if there's an error
  else if (window.location.href.includes('?error=')) {

    // Get the error message and print to console (also
    // available in the url though.)
    var error = window.location.href.split('?error=')[1];
    window.alert(error);
		console.log(error);
  }
  // Else, probably just a normal request, so validate
  // current instagram data.
  else {
    verifyInstagramConnection();
  }
}

// On load, register the handler for the logout button.
$(window).on('load', function() {

  // Logout handler
  document.getElementById('logout').onclick = function() {

    // Clear AWS credentials
    AWS.config.credentials = null;
    apigClient = null;

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

// Register the handler for the Connect to Instagram button.
// The button is not shown by default.
$(window).on('load', function() {

  // Login with instagram
  document.getElementById('login-instagram').onclick = function() {

    console.log("Login clicked");

    // Redirect user to instagram
    var instagramRedirect = "https://api.instagram.com/oauth/authorize/?" +
        "client_id=" + InstaClientID +
        "&redirect_uri=" + APPNAME + "/index.html" +
        "&response_type=code";

    location.href = instagramRedirect;
  };
});

// Register the handler for the refresh button. The button
// calls refresh from the instagram API.
$(window).on('load', function() {

  document.getElementById('refresh').onclick = function() {

    console.log("Refreshing");

    // Send request to AWS API Gateway to start the refresh
    var body = {
      requestType: "Refresh",
      user: AWS.config.credentials.identityId
    };
    apigClient.instaGet(null, body).then(function(result) {
        console.log(result);

        // Verify an error was not return
        if (result.data.responseType == "Error") {
          window.alert(result.data.responseType + ": " + result.data.responseDetails);
        }
        else {
          $('#refresh_icon').toggleClass('rotated');
        }
    }).catch(function(result) {
        console.log(result);
    });
  };
});
