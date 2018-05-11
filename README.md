# COMS-E6998-Instagram-Predictor
COMS E6998 Cloud Computing and Big Data Project: A website to predict the likes and comments an image will receive when it is posted to Instagram. For full documentation, see the report in the docs folder.

## Site Link
https://s3.us-east-1.amazonaws.com/image-analysis-project/login.html</br>

## Demo Video
https://www.youtube.com/watch?v=hYAPURgjEL4&feat+ure=youtu.be

## Repository Structure
This git repository contains the website source code, lambda function source code, api description, and documentation. The following four sections explain each of these in more depth.

### Website Source Code
The website source code for this project can be found at `./root/`. In this directory, there are three html files for the different web pages:
```
./root/index.html
./root/login.html
./root/terms_privacy.html
```
The homepage is described by index.html, the login page is described by login.html and the terms of use and privacy policy page is described by terms_privacy.html. Each of these files uses the contents of `./root/css/`, `./root/js/`, and `./root/media/`. The media folder contains the refresh icon which is used when transitioning pages. The js folder contains all the JavaScript and the css folder contains all the style files. Specifically, the css folder contains:
```
./root/css/login.css
./root/css/style.css
```
The login.css file is the styling used by the login page while style.css is the styling used by the home page. The privacy policy page uses the styling in style.css as well.</br></br>

The js folder contains all the JavaScript for the project. It contains the following:
```
./root/js/amazon.js
./root/js/facebook.js
./root/js/google.js
./root/js/imageanalytics.js
./root/js/index.js
./root/js/login.js
./root/js/sdk/
```
The first 4 files (amazon.js, facebook.js, google.js, and imageanalytics.js) contain all the JavaScript required to implement logging in with each of the associated services. We originally allowed users to login with Google. However, due to issues with our site being hosted in S3, we were unable to implement that login at the same url as the other login services. As a result, we have removed that capability. The index.js file contains the JavaScript for the home page (index.html) and contains most of the front end logic. The login.js file contains the JavaScript for the login page. It integrates with the first four files to implement logging users in. The sdk folder contains the AWS JavaScript SDK [3] and the API SDK. Both of these were downloaded from AWS and are used to integrate the frontend with the backend.

### Lambda Function Source Code
The backend execution for this project is facilitated by 8 AWS Lambda functions. These functions handle requests made to the API and interact with each other in order to implement the website's features. These 8 functions can be found at:

```
./lambda/Insta.js
./lambda/Refresh.js
./lambda/ProcessImage.js
./lambda/BuildML.js
./lambda/GetStatus.js
./lambda/Inference.js
./lambda/CancelModel.js
./lambda/DisconnectInstagram.js
```
For more information on these functions and how they interact with the backend, please see Section 3.2.5 in the report in the documents folder.

### API
The api description for this project can be found at `./api/InstaAnalysis.yaml`. The description is in swagger format and exported from AWS API Gateway. More on the API can be found in Section 3.2.4 in the report in the documents folder.

### Documentation
This project is documented by a report which can be found at the following path:
```
./docs/report.pdf
```
The report contains a full description of the project, an explanation of the architecture, the backend, and the frontend. 


