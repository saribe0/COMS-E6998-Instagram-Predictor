var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

function getUserFromDynamo(user, callback) {
    
    // Prepare the request
    var params = {
        Key: {
            "IdentityId": {
                S: user
            }
        }, 
        TableName: TABLE_NAME
    };
    
    // Send the request
    dynamodb.getItem(params, function(err, data) {
        if (err) {
            
            // Call error handler on error
            console.log(err, err.stack);
            var message = "Error: Unable to get user from the database.";
            errorHandler(message, callback);
        }
        else {
            console.log(data);
            var hasModel = false;
            var modelTimestamp = "N/A";
            if (data.Item.hasOwnProperty("LabelData")) {
                hasModel = true;
            }
            if (data.Item.hasOwnProperty("ModelTimestamp")) {
                modelTimestamp = data.Item.ModelTimestamp.S;
            }
            // Return the right message
            if (data.Item.hasOwnProperty("BuildingModel")) {
                var buildingModel = data.Item.BuildingModel.BOOL;
                if (buildingModel) {
                    var message = "Model is still being built.";
                    var processedImages = parseInt(data.Item.ImagesCompleted.N, 10);
                    var totalImages = parseInt(data.Item.ImagesProcessing.N, 10);
                    successHandler(message, true, processedImages, totalImages, hasModel, modelTimestamp, callback)
                }
                else {
                    var message = "No model in progress.";
                    successHandler(message, false, 0, 0, hasModel, modelTimestamp, callback);
                }
            }
            else {
                var message = "No model has been started.";
                successHandler(message, false, 0, 0, hasModel, modelTimestamp, callback);
            }
        }
    });
}

function successHandler(message, inProgress, completedImages, totalImages, hasModel, modelTimestamp, callback) {
    var response = {
        responseType: "Response",
        message: message,
        modelStatus: {
            inProgress: inProgress,
            completedImages: completedImages,
            totalImages: totalImages
        },
        hasModel: hasModel,
        modelTimestamp: modelTimestamp
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
    if (requestHandler != "GetStatus") {
        var message = "Error: Invalid request type.";
        errorHandler(message, callback);
    }
    
    getUserFromDynamo(event.user, callback);
};