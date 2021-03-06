
window.onAmazonLoginReady = function() {
  amazon.Login.setClientId('amzn1.application-oa2-client.c4e2e23dcc224941a585269152d89be5');
};

(function(d) {
  var a = d.createElement('script'); a.type = 'text/javascript';
  a.async = true; a.id = 'amazon-login-sdk';
  a.src = 'https://api-cdn.amazon.com/sdk/login1.js';
  d.getElementById('amazon-root').appendChild(a);
})(document);

// Split login and logouts
if($('body').is('.login_page')) {
  document.getElementById('LoginWithAmazon').onclick = function() {
    options = { scope : 'profile' };
    amazon.Login.authorize(options, function(response) {
      if ( response.error ) {
        console.log('There was a problem logging in with Amazon.');
        alert('oauth error ' + response.error);
        return;
      }

    // User is loged in here, create AWS credentials
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITYPOOLID,
      Logins: {
        'www.amazon.com': response.access_token
      }
    });
    AWS.config.credentials.get(function(err){
      if (err) {
  			console.log(err);
  		}
  		else {
        console.log('Secret: ' + AWS.config.credentials.secretAccessKey);
        console.log('Access: ' + AWS.config.credentials.accessKeyId);
        console.log('Token : ' + AWS.config.credentials.sessionToken);
        console.log('IdentityId: ' + AWS.config.credentials.identityId);
        console.log('Amazon Authentication Complete.');

        loginSaveCognitoCredentials('Amazon');
  		}
    });

    console.log('success: ' + response.access_token);
    });
  }
}

function amazonLogout() {
  amazon.Login.logout();
  redirectToNotLoggedIn();
}
