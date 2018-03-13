function onGoogleSignIn(googleUser) {

  // Useful data for your client-side scripts:
  var profile = googleUser.getBasicProfile();
  console.log("ID: " + profile.getId()); // Don't send this directly to your server!
  console.log('Full Name: ' + profile.getName());
  console.log('Given Name: ' + profile.getGivenName());
  console.log('Family Name: ' + profile.getFamilyName());
  console.log("Image URL: " + profile.getImageUrl());
  console.log("Email: " + profile.getEmail());

  // The ID token you need to pass to your backend:
  var id_token = googleUser.getAuthResponse().id_token;
  console.log("ID Token: " + id_token);
};

function onGoogleFailure(error) {
  console.log(error);
}

function renderGoogleButton() {
  console.log('Rendering Button')
  gapi.signin2.render('my-signin2', {
    'scope': 'profile email',
    'width': 300,
    'height': 40,
    'border-radius': 4,
    'longtitle': true,
    'theme': 'dark',
    'onsuccess': onGoogleSignIn,
    'onfailure': onGoogleFailure
  });
}
