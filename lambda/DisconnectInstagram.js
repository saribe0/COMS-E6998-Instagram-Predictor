var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

// Updates the database with new image ids after the update was run.
function removeInstagram(user, callback) {

    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#I": "InstagramToken"
        },
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "REMOVE #I"
    };
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            console.log(err, err.stack);
            
            // An error occurred, return it to the API
            var message = "Error disconnecting from Instagram: " + err;
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
            if (data.Attributes.hasOwnProperty("ModelTimestamp")) {
                modelTimestamp = data.Attributes.ModelTimestamp.S;
            }
        
            // Success
            var message = "Successfully disconnected from Instagram.";
            successHandler(message, hasModel, modelTimestamp, trainingInProgress, callback);
        }
    });
}

function successHandler(message, hasModel, modelTimestamp, trainingInProgress, callback) {
    var response = {
        responseType: "Response",
        responseDetails: message,
        hasModel: hasModel,
        modelTimestamp: modelTimestamp,
        trainingInProgress: trainingInProgress,
        authenticated: false
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

    // First get the request type
    var requestHandler = event.requestType;
    
    // Handle an invalid input
    if (requestHandler != "DisconnectUser") {
        var message = "Error: Invalid request type.";
        errorHandler(message, callback);
    }

    removeInstagram(event.user, callback)
};