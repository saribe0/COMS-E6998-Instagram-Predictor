var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

function cancelModel(user, callback) {
    
    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#R": "BuildingModel"
        }, 
        ExpressionAttributeValues: {
            ":bm": {
                BOOL: false
            }
        }, 
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        },
        UpdateExpression: "SET #R = :bm",
        ReturnValues: "ALL_NEW"
    };
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            console.log(err, err.stack);
            
            // An error occurred, return it to the API
            var message = "Error while cancelling the model: " + err;
            errorHandler(message, callback);
        }
        else {
        
            // Report success
            var hasModel = false;
            if (data.Attributes.hasOwnProperty("LabelData")) {
                hasModel = true;
            }
            var modelTimestamp = "N/A";
            if (data.Attributes.hasOwnProperty("ModelTimestamp")) {
                modelTimestamp = data.Attributes.ModelTimestamp.S;
            }
            var message = "Successfully cancelled the model"
            successHandler(message, hasModel, modelTimestamp, callback);
        }
    });
}

function successHandler(message, hasModel, timestamp, callback) {

    var response = {
        responseType: "Response",
        hasModel: hasModel,
        message: message,
        modelTimestamp: timestamp
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
    if (requestHandler != "CancelModel") {
        var message = "Error: Invalid request type.";
        errorHandler(message, callback);
    }
    
    // Cancel the model
    cancelModel(event.user, callback);
};