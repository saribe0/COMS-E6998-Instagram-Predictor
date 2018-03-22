
window.onAmazonLoginReady = function() {
  amazon.Login.setClientId('amzn1.application-oa2-client.e61f6c1554d042309dbbe955fd7c22e3');
};

(function(d) {
  var a = d.createElement('script'); a.type = 'text/javascript';
  a.async = true; a.id = 'amazon-login-sdk';
  a.src = 'https://api-cdn.amazon.com/sdk/login1.js';
  d.getElementById('amazon-root').appendChild(a);
})(document);

document.getElementById('LoginWithAmazon').onclick = function() {
  options = { scope : 'profile' };
  amazon.Login.authorize(options, function(response) {
    if ( response.error ) {
      console.log('There was a problem logging in with Amazon.');
      alert('oauth error ' + response.error);
      return;
    }

  // User is loged in here, create AWS credentials
  AWS.config.credentials = new AWS. CognitoIdentityCredentials({
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
      console.log('Amazon Authentication Complete.');

      loginSaveCognitoCredentials();
		}
  });

  console.log('success: ' + response.access_token);
  });
};
