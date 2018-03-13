
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
  console.log("Testing");
  options = { scope : 'profile' };
  amazon.Login.authorize(options, 'https://s3.us-east-2.amazonaws.com/insta-analysis-project/index.html');
  return false;
};
