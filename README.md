# COMS-E6998-Instagram-Predictor
COMS E6998 Cloud Computing and Big Data Project: A website to predict the quality of an instagram post based off the tags and other metadata in the photo

## Site Links
https://s3.us-east-2.amazonaws.com/insta-analysis-project/index.html </br>
http://insta-analysis-project.s3-website.us-east-2.amazonaws.com/#

## Current Status
* Added login buttons for InstaAnalysis, Google, Facebook, and Amazon
  * InstaAnalysis works for: Both
  * Google works for: http  (Currently commented out)
  * Facebook works for: https
  * Amazon works for: https
* Once logged in, nothing happens
* Login should create identity in federated identities

## Next Steps
* Determine user management
  * Add a cookie to keep track of logins
  * Add main page for logged in users
  * Include a logout button on the main page
  * Determine how authentication can work with federated identities
* Look into SSL enabled websites on AWS
* Build API Gateway, DynamoDB, and Lambda functions

## Resources
### Login Identities
#### Amazon
https://sellercentral.amazon.com/gp/homepage.html/ref=xx_home_logo_xx </br>
#### Google
https://developers.google.com/identity/sign-in/web/sign-in#before_you_begin </br>
https://developers.google.com/identity/sign-in/web/build-button </br>
#### Facebook
https://developers.facebook.com/apps/ </br>
