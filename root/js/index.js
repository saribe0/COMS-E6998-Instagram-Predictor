var APPNAME = 'https://s3.us-east-1.amazonaws.com/image-analysis-project'
var apigClient = null;

var InstaClientID = 'd50144dc0378478c849bff2ae3c3abf5'
var identityType = '';
var credentialKeys = [
  'accessKeyId',
  'secretAccessKey',
  'sessionToken',
  'identityId'
];

var keepRefreshing = false;
var hasModelDefault = true;
var modelTimestampDefault = "N/A";

function showLoadingScreen() {
  $('#loading').show().css('display', 'block');
}

function hideLoadingScreen() {
  $('#loading').hide();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Monitor the progress of instagram as it's refreshed in
// the backend
async function monitorRefresh() {

  var body = {
    requestType: "GetStatus",
    user: AWS.config.credentials.identityId
  };

  if (keepRefreshing) {

    // Sleep for 1/4 of a second then check the status
    await sleep(500);
    console.log("Checking model status");

    // Call to check the status. If still refreshing, call
    // this function again until the fresh is done.
    // Send request to AWS API Gateway to start the refresh
    apigClient.modelGetStatusPost(null, body).then(function(result) {
        console.log(result);

        // If an error was returned, stop rotation and inform the user
        if (result.data.responseType == "Error") {
          window.alert(result.data.responseType + ": " + result.data.responseDetails);
        }
        else if (result.data.hasOwnProperty("errorMessage")) {
          window.alert(result.data.errorMessage);
        }
        else {

          // Call monitor refresh function
          var hasModel = result.data.hasModel;
          var modelInTraining = result.data.modelStatus.inProgress;
          var modelTimestamp = result.data.modelTimestamp;

          // If the model has finished training
          if (!modelInTraining) {
            console.log("Finished building model");
            keepRefreshing = false;
            $("#cancel-model").css("background", "white")
            hasInstagramModel(hasModel, false, modelTimestamp);
          }
          else {
            var completedImages = result.data.modelStatus.completedImages;
            var totalImages = result.data.modelStatus.totalImages;

            var completedPercent = completedImages / totalImages * 100;
            var uncompletedPercent = 1 - completedPercent;
            $("#cancel-model").css("background", "linear-gradient(90deg, #ADFF62 " + completedPercent.toString() + "%, white " + uncompletedPercent.toString() + "%)")

            // If the model has not finished training
            console.log("Completed " + completedImages.toString() + " of " + totalImages.toString());
            monitorRefresh();
          }
        }
    }).catch(function(result) {
        console.log(result);
    });
  }
}

// Simple function to handle toggling between connected and disconnected
// from Instagram
function connectedToInstagram(isConnected) {

  // Show and hide the different action boxes
  if (isConnected) {
    $('#login-instagram').hide();
    $('#disconnect-instagram').show().css('display', 'flex');
    $('#model-actions').show().css('display', 'block');
  }
  else {
    $('#login-instagram').show().css('display', 'flex');
    $('#disconnect-instagram').hide();
    $('#model-actions').hide();
  }
}

function hasInstagramModel(hasModel, trainingInProgress, modelTimestamp) {

  if (hasModel == null) {
    hasModel = hasModelDefault;
  }
  else {
    hasModelDefault = hasModel;
  }
  if (modelTimestamp == null) {
    modelTimestamp = modelTimestampDefault;
  }
  else {
    modelTimestampDefault = modelTimestamp;
  }

  // Show and hide the different action boxes
  if (hasModel && trainingInProgress) {
    $('#add-photo').show().css('display', 'flex');
    $('#cancel-model').show().css('display', 'flex');
    keepRefreshing = true;
    monitorRefresh();
    $('#train-model').hide();
  }
  else if (hasModel && !trainingInProgress) {
    $('#add-photo').show().css('display', 'flex');
    document.getElementById("train-model-text").innerHTML = "Model Last Trained On " + modelTimestamp + " UTC. Would You Like To Re-Train?";
    keepRefreshing = false;
    $('#train-model').show().css('display', 'flex');
    $('#cancel-model').hide();
  }
  else if (!hasModel && trainingInProgress) {
    $('#add-photo').hide();
    $('#train-model').hide();
    $('#cancel-model').show().css('display', 'flex');
    keepRefreshing = true;
    monitorRefresh();
  }
  else {
    $('#add-photo').hide();
    document.getElementById("train-model-text").innerHTML = "No Valid Model Found. Train One Now?";
    $('#train-model').show().css('display', 'flex');
    keepRefreshing = false;
    $('#cancel-model').hide();
  }
  hideLoadingScreen();
}

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
        connectedToInstagram(false);
      }
      else if (result.data.hasOwnProperty("errorMessage")) {
        connectedToInstagram(false);
        window.alert(result.data.errorMessage);
      }
      if (result.data.authenticated == false) {
        connectedToInstagram(false);
      }

      // If the user is connectd, get the users model and training status
      var userHasModel = result.data.hasModel;
      var modelInTraining = result.data.trainingInProgress;
      var modelTimestamp = result.data.modelTimestamp;
      hasInstagramModel(userHasModel, modelInTraining, modelTimestamp);

  }).catch(function(result) {
      console.log(result);
      window.alert("It appears your session has ended. Please sign in again.");
      logout();
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
  showLoadingScreen();
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

        // Clean the url to remove the code
        window.history.pushState({}, document.title, "/image-analysis-project/index.html" );

        // If there was an error with the request, alert the user.
        if (result.data.responseType == "Error") {
          window.alert(result.data.responseType + ": " + result.data.responseDetails);

          // Continue with normal checks if failed
          verifyInstagramConnection();
        }
        else if (result.data.hasOwnProperty("errorMessage")) {
          window.alert(result.data.errorMessage);
          // Continue with normal checks if failed
          verifyInstagramConnection();
        }
        // Otherwise, hide the login button
        else {
          // Hide the connect ot instagram button
          connectedToInstagram(true);

          // Also get the users model and training status
          var userHasModel = result.data.hasModel;
          var modelInTraining = result.data.trainingInProgress;
          var modelTimestamp = result.data.modelTimestamp;
          hasInstagramModel(userHasModel, modelInTraining, modelTimestamp);
        }

  	}).catch(function(result) {
        console.log(result)
        window.alert("It appears your session has ended. Please sign in again.");
        logout();
  	});
  }
  // Else if there's an error
  else if (window.location.href.includes('?error=')) {

    // Get the error message and print to console (also
    // available in the url though.)
    var error = window.location.href.split('?error=')[1];
    hideLoadingScreen();
    window.alert(error);
		console.log(error);
  }
  // Else, probably just a normal request, so validate
  // current instagram data.
  else {
    verifyInstagramConnection();
  }
}

function logout() {

  showLoadingScreen();

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

// On load, register the handler for the logout button.
$(window).on('load', function() {

  // Logout handler
  document.getElementById('logout').onclick = function() {
    logout();
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

// Register the handler for the Disconnect from Instagram button.
// This button is shown by default and disappears/appaears w the connect button.
$(window).on('load', function() {

  // Login with instagram
  document.getElementById('disconnect-instagram').onclick = function() {

    console.log("Disconnect clicked");
    showLoadingScreen();

    // Send request to AWS API Gateway to disconnect the user
    var body = {
      requestType: "DisconnectUser",
      user: AWS.config.credentials.identityId
    };
    apigClient.instaDelete(null, body).then(function(result) {
        console.log(result);
        // Show the login box if there was an error or authentication failed.
        // Also alert if an error was recieved.
        if (result.data.responseType == "Error") {

          // Unable to disconnect the user
          window.alert(result.data.responseType + ": " + result.data.responseDetails);
          hideLoadingScreen();
        }
        else if (result.data.hasOwnProperty("errorMessage")) {
          window.alert(result.data.errorMessage);
          hideLoadingScreen();
        }
        if (result.data.authenticated == false) {

          // User is disconnected
          connectedToInstagram(false);

          // Call monitor refresh function
          var hasModel = result.data.hasModel;
          var modelInTraining = result.data.trainingInProgress;
          var modelTimestamp = result.data.modelTimestamp;
          hasInstagramModel(hasModel, modelInTraining, modelTimestamp);
        }
    }).catch(function(err) {
        console.log(err);
        window.alert("It appears your session has ended. Please sign in again.");
        logout();
    });
  };
});

// Register the handler for the refresh button. The button
// calls refresh from the instagram API.
$(window).on('load', function() {

  document.getElementById('train-model').onclick = function() {

    console.log("Training Model");
    $('#cancel-model').show().css('display', 'flex');
    $('#train-model').hide();

    // Send request to AWS API Gateway to start the refresh
    var body = {
      requestType: "Refresh",
      user: AWS.config.credentials.identityId
    };
    apigClient.instaPut(null, body).then(function(result) {
        console.log(result);

        // If an error was returned, stop rotation and inform the user
        if (result.data.responseType == "Error") {
          window.alert(result.data.responseType + ": " + result.data.responseDetails);
          $('#train-model').show().css('display', 'flex');
          $('#cancel-model').hide();
        }
        else if (result.data.hasOwnProperty("errorMessage")) {
          window.alert(result.data.errorMessage);
          $('#train-model').show().css('display', 'flex');
          $('#cancel-model').hide();
        }
        else {
          // Call monitor refresh function
          var hasModel = result.data.hasModel;
          var modelInTraining = result.data.trainingInProgress;
          var modelTimestamp = result.data.modelTimestamp;
          hasInstagramModel(hasModel, modelInTraining, modelTimestamp);
        }
    }).catch(function(result) {
        console.log(result);
        window.alert("It appears your session has ended. Please sign in again.");
        logout();
    });
  };
});

// Register the handler for the cancel model button. The button
// first verifies the user would like to cancel training and then
// calls the API Gateway method to cancel training.
$(window).on('load', function() {

  document.getElementById('cancel-model').onclick = function() {

    console.log("Canceling model in training");

    // Send request to AWS API Gateway to start the refresh
    var body = {
      requestType: "CancelModel",
      user: AWS.config.credentials.identityId
    };
    apigClient.modelCancelPost(null, body).then(function(result) {
        console.log(result);

        // If an error was returned, inform the user
        if (result.data.responseType == "Error") {
          window.alert(result.data.responseType + ": " + result.data.responseDetails);
        }
        else if (result.data.hasOwnProperty("errorMessage")) {
          window.alert(result.data.errorMessage);
        }
        else {
          // Call monitor refresh function
          var hasModel = result.data.hasModel;
          var modelTimestamp = result.data.modelTimestamp;
          hasInstagramModel(hasModel, false, modelTimestamp);
        }
    }).catch(function(result) {
        console.log(result);
        window.alert("It appears your session has ended. Please sign in again.");
        logout();
    });
  };
});

function uploadFileAndAnalyze(image) {

  // Prepare the request to the API
  var body = {
    requestType: "AnalyzeImage",
    user: AWS.config.credentials.identityId,
    image: image
  };

  $('#likes-p').text("(Thinking...)");
  $('#comments-p').text("(Thinking...)");

  // Make the API Request
  apigClient.modelInferPost(null, body).then(function(result) {
      console.log(result);

      // If an error was returned, inform the user
      if (result.data.responseType == "Error") {
        window.alert(result.data.responseType + ": " + result.data.responseDetails);
        $('#image-holder').hide();
      }
      else if (result.data.hasOwnProperty("errorMessage")) {
        window.alert(result.data.errorMessage);
        $('#image-holder').hide();
      }
      else {
        // Update the view with the predicted values
        try {
          var likes = parseInt(result.data.prediction.likes);
          var comments = parseInt(result.data.prediction.comments);
        }
        catch(err) {
          var err2 = "(An Error Occured)"
          $('#likes-p').text(err2);
          $('#comments-p').text(err2);
        }
        if (likes != null && comments != null) {
          $('#likes-p').text(likes.toString());
          $('#comments-p').text(comments.toString());
        }
        else {
          var err = "(An Error Occured)"
          $('#likes-p').text(err);
          $('#comments-p').text(err);
        }

      }
  }).catch(function(result) {
      console.log(result);
      window.alert("It appears your session has ended. Please sign in again.");
      logout();
  });
}

// Actually uploads the file
function upload_file() {
  var preview = document.getElementById('display_image');
  var file    = document.getElementById('upload_image').files[0];
  var reader  = new FileReader();

  // Get the image
  reader.onloadend = function() {

    // The image as a base64 encoded string
    var image = reader.result;

    // Set the image on the screen
    preview.src = image;
    $('#image-holder').show().css('display', 'block');

    // Upload and analyze the file
    uploadFileAndAnalyze(image);
  }

  // Call the read file and handle no file upload
  if (file) {
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    $('#image-holder').hide();
  }
}

// Register the handler for the analyze an image button. This lets
// the user pick an image from their desktop, upload it to s3 (and display it)
// and then analyzes it and returns a result
$(window).on('load', function() {
  document.getElementById('add-photo').onclick = function() {
    $('#upload_image').click();
  }
});
