window.fbAsyncInit = function() {
  FB.init({
    appId      : '195418547899109',
    cookie     : true,
    xfbml      : true,
    version    : 'v1.0'
  });
  FB.AppEvents.logPageView();

  FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
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

function statusChangeCallback() {

}
