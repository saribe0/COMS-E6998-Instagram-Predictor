$(window).on('load', function() {

    if ($('body').is('.login_page')) {
  		// Incorporate credentials being valid -> Whenever the page is reloaded or a request is about to be made,
  		// - check credentials
  		// - AWS.config.credentials.get(callback) can be used
  		// - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html#get-property
  		if (window.location.href.includes('?')) {
  			var codeRaw = window.location.href.split('?');
  			var code = codeRaw[1].split('=')[1];
  			console.log(code);

        // Exchange auth code for token
  			$.ajax({
  				url: "https://insta-analysis.auth.us-east-2.amazoncognito.com/oauth2/token",
  				type: 'post',
  				data: {
  					grant_type: 'authorization_code',
  					client_id: '73p9hpm79uolerj3gp8gekqf61',
  				 	code: code,
  				 	redirect_uri: 'https://s3.us-east-2.amazonaws.com/insta-analysis-project/login.html'
  				},
  				headers:{
  					'Content-Type': 'application/x-www-form-urlencoded'
  				},
  				dataType: 'json',
  				success: function(data){
  					console.log(data);

            // Create the credentials object
  					AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  						IdentityPoolId: IDENTITYPOOLID,
  						Logins: {
  							'cognito-idp.us-east-2.amazonaws.com/us-east-2_d1Vf3Wg0W': data.id_token
  						}
  					});

            // Get the actual credentials
  					AWS.config.credentials.get(function(err){
  						if (err) {
  							console.log(err);
  						}
  						else {
                console.log('Secret: ' + AWS.config.credentials.secretAccessKey);
                console.log('Access: ' + AWS.config.credentials.accessKeyId);
                console.log('Token : ' + AWS.config.credentials.sessionToken);
                console.log('IdentityId: ' + AWS.config.credentials.identityId);
                console.log('InstaAnalytics Authentication Complete.');

                loginSaveCognitoCredentials('InstaAnalytics');
  						}
  					});
  				},
  				error: function(data) {
  					console.log(data);
            console.log('There was a problem logging in with InstaAnalytics');
  				}
  			});
  		}
  		else {
  			console.log('No code, must be redirect for login');
  		}
  }
});

function instaAnalyticsLogout() {

  console.log('Logged Out!');

  // Segue to login page
  redirectToNotLoggedIn();
}
