var request = require("request");
var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

// Instagram Client Info
var TOKEN_HOST = "https://api.instagram.com/oauth/access_token";
var CLIENT_ID = "d50144dc0378478c849bff2ae3c3abf5";
var CLIENT_SECRET = "0222482dbba745afa60ff984ab4c24d9";
var REDIRECT_URL = "https://s3.us-east-1.amazonaws.com/image-analysis-project/index.html";

// Checks that the token is still valid
function checkTokenValidity(token, hasModel, modelTimestamp, trainingInProgress, callback) {
    
    // Prepare a simple request to get user info
    var options = {
        method: "GET",
        url: "https://api.instagram.com/v1/users/self/?access_token=" + token
    };
    console.log(options);
    
    // Send the request
    request(options, function(error, response, body) {
        
        // Convert to JSON
        var body_json = JSON.parse(body);
        
        // Handle any errors
        if (error) {
            var message = "The following error occurred while makeing a request to Instagram: " + error;
            errorHandler(message, callback);
        }
        
        // Check to see if the request returned a user. If so, the token is valid.
        if (body_json.hasOwnProperty("data")) {

            var message = "The token for " + body_json.data.full_name + " is valid.";
            successHandler(message, true, hasModel, modelTimestamp, trainingInProgress, callback);
        }
        // If the request doesn't contain user data, the token is invalid.
        else {
            
            var message = "The provided token is not valid.";
            successHandler(message, false, hasModel, modelTimestamp, trainingInProgress, callback);
        }
    });
}

function createUserMap(json_object) {
    
    for (var key in json_object) {

        var new_obj;
        switch (typeof(json_object[key])) {
            case "string":
                if (json_object[key] == "") {
                    json_object[key] = "-";
                }
                new_obj = {
                    "S": json_object[key]
                };
                break;
            case "boolean":
                new_obj = {
                    "BOOL": json_object[key]
                };
        }
        json_object[key] = new_obj;
    }
    
    return json_object;
}

// Updates the token in the database for the user
function updateToken(user, token, user_info, callback) {

    // Set parameters
    var params = {
        ExpressionAttributeNames: {
            "#IT": "InstagramToken",
            "#IU": "InstagramUser"
        }, 
        ExpressionAttributeValues: {
            ":t": {
                S: token
            },
            ":u": {
                M: createUserMap(user_info)
            }
        }, 
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #IT = :t, #IU = :u"
    };
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            console.log(err, err.stack);
            
            // An error occurred, return it to the API
            var message = "Error updating the database: " + err;
            errorHandler(message, callback);
        }
        else {
            
            var hasModel = false;
            var trainingInProgress = false;
            var modelTimestamp = "N/A";
            if (data.Attributes.hasOwnProperty("LabelData")) {
                hasModel = true;
            }
            if (data.Attributes.hasOwnProperty("BuildingModel") && data.Attributes.BuildingModel == true) {
                trainingInProgress = true;
            }
            if (data.Attributes.hasOwnProperty("ModelTimestamp") ) {
                modelTimestamp = data.Attributes.ModelTimestamp.S;
            }
            
            // Successfully updated the item. return success to the user
            var message = "Authenticated with Instagram and database is updated.";
            successHandler(message, true, hasModel, modelTimestamp, trainingInProgress, callback);
        }
    });
}

// Authenticates a user with the instagram API given the provided code and the
// their user ID.
function authenticate(user, code, callback) {
    
    // Prepare the request
    var options = {
        method: "POST",
        url: TOKEN_HOST,
        headers: {
            "Cache-Control": "no-cache",
            "content-type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW" 
        },
        formData: { 
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URL,
            code: code 
        }
    };

    // Send the request
    request(options, function (error, response, body) {
      
        // Convert the body to JSON
        var body_json = JSON.parse(body);
        
        // Handle any errors
        if (error) {
            var message = "An error occurred when authenticating with Instagram.";
            errorHandler(message, callback);
        }
        if (body_json.hasOwnProperty("error_type")) {
            var message = "The following error occured while authenticating with instagram: " + body_json.error_message;
            errorHandler(message, callback);
        }
        else {
            // When a token has been successfully recieved, update the database with
            // both the token and returned user.
            var access_token = body_json.access_token;
            var user_info = body_json.user;
            
            updateToken(user, access_token, user_info, callback);
        }
    });
}

// Check to determine whether a user is authenticated or not with Instgram. 
// Attemps to get the user from the database and verify their Instagram token
// is still valid.
function checkAuthentication(user, callback) {
    
    // Prepare request for a user
    var params = {
        Key: {
            "IdentityId" : {
                S: user
            }
        },
        TableName: TABLE_NAME
    };
    
    // Get the user from the database
    dynamodb.getItem(params, function(err, data) {
        if (err) {
            
            // An error occurred, return it to the API
            var message = "Error getting the user from the database: " + err;
            errorHandler(message, callback);
        }
        else {
            
            var hasModel = false;
            var trainingInProgress = false;
            var modelTimestamp = "N/A";
            if (data.hasOwnProperty("Item") && data.Item.hasOwnProperty("LabelData")) {
                hasModel = true;
            }
            if (data.hasOwnProperty("Item") && data.Item.hasOwnProperty("BuildingModel") && data.Item.BuildingModel == true) {
                trainingInProgress = true;
            }
            if (data.hasOwnProperty("Item") && data.Item.hasOwnProperty("ModelTimestamp") ) {
                modelTimestamp = data.Item.ModelTimestamp.S;
            }
            
            // Check for an access token
            if (data.hasOwnProperty("Item") && data.Item.hasOwnProperty("InstagramToken")) {
                
                // Check the validity of the found token
                checkTokenValidity(data.Item.InstagramToken.S, hasModel, modelTimestamp, trainingInProgress, callback);
            }
            else {
                var message = "Could not find a token for the user.";
                successHandler(message, false, hasModel, modelTimestamp, trainingInProgress, callback);
            }
        }
    });
}

function successHandler(message, auth, hasModel, modelTimestamp, trainingInProgress, callback) {
    var response = {
        responseType: "Response",
        responseDetails: message,
        authenticated: auth,
        hasModel: hasModel,
        modelTimestamp: modelTimestamp,
        trainingInProgress: trainingInProgress
    };
    callback(null, response);
}

function errorHandler(message, callback) {
    var response = {
        responseType: "Error",
        responseDetails: message
    };
    callback(null, response);
}

exports.handler = (event, context, callback) => {
    
    console.log(event);
    
    var handlerType = event.requestType;
    
    // Switch on the request type. Ensure that any properties are included and
    // then call the proper handler.
    switch (handlerType) {
        case "Authenticate":
            if (event.hasOwnProperty("code")) {
                authenticate(event.user, event.code, callback);
            }
            else {
                var message = "Requests with type Authenticate must contain a code.";
                errorHandler(message, callback);
            }
            break;
        case "CheckAuthentication":
            checkAuthentication(event.user, callback);
            break;
        default:
            var message = "Invalid requestType: " + handlerType + ". Valid types are Authenticate and CheckAuthentication.";
            errorHandler(message, callback);
            break;
    }
};
