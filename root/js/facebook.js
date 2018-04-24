window.fbAsyncInit = function() {
  FB.init({
    appId      : '195418547899109',
    cookie     : true,
    xfbml      : true,
    version    : 'v1.0'
  });
  FB.AppEvents.logPageView();

  // Log the user in
  FB.getLoginStatus(function(response) {
      // Split login and logouts
      if($('body').is('.login_page')) {
        statusChangeCallback(response);
      }
  });
};

(function(d, s, id){
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.12&appId=195418547899109&autoLogAppEvents=1';
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));

function checkLoginState() {
  FB.getLoginStatus(function(response) {
    statusChangeCallback(response);
  });
}

function statusChangeCallback(response) {
  if (response.authResponse) {
    console.log('You are now logged in with Facebook.');

    // Add the FB token to Cognito
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITYPOOLID,
      Logins: {
        'graph.facebook.com': response.authResponse.accessToken
      }
    });

    // Obtain AWS credentials
    AWS.config.credentials.get(function(err) {
      if (err) {
				console.log(err);
        finishLogin();
			}
			else {
				console.log('Secret: ' + AWS.config.credentials.secretAccessKey);
				console.log('Access: ' + AWS.config.credentials.accessKeyId);
        console.log('Token : ' + AWS.config.credentials.sessionToken);
        console.log('IdentityId: ' + AWS.config.credentials.identityId);
				console.log('Facebook Authentication Complete.');

        loginSaveCognitoCredentials('Facebook');
			}
    });
  } else {
    console.log('There was a problem logging in with Facebook.');
    finishLogin();
  }
}

function facebookLogout() {
  var done = false;
  FB.logout(function(response) {
    console.log(response);

    // Segue to login page
    redirectToNotLoggedIn();
  });
}
