var http = require("https");
var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();
var lambda = new AWS.Lambda();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

// Root address for instagram requests
var INSTA_ROOT = "api.instagram.com";
var INSTA_PATH = "/v1/users/self/media/recent/?";

var PROCESS_LAMBDA = "InstaAnalysis-ProcessImage";

var downloadedImages = [];

// Updates the database with data on the images.
function saveImageData(user, callback) {

    var buildingModel = true;
    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#D": "ImagesProcessing",
            "#C": "ImagesCompleted",
            "#I": "InstagramImages",
            "#R": "BuildingModel"
        }, 
        ExpressionAttributeValues: {
            ":ip": {
                N: downloadedImages.length.toString()
            },
            ":ic": {
                N: "0"
            },
            ":bm": {
                BOOL: buildingModel
            },
            ":ii": {
                L: []
            }
        }, 
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        }, 
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #D = :ip, #C = :ic, #I = :ii, #R = :bm"
    };
    
    if (downloadedImages.length == 0) {
        buildingModel = false;
        
        var d = new Date();
        var time = d.toLocaleTimeString();
        var day = d.toLocaleDateString();
        
        // Update paramters
        params = {
            ExpressionAttributeNames: {
                "#D": "ImagesProcessing",
                "#C": "ImagesCompleted",
                "#I": "InstagramImages",
                "#R": "BuildingModel",
                "#T": "ModelTimestamp"
            }, 
            ExpressionAttributeValues: {
                ":ip": {
                    N: downloadedImages.length.toString()
                },
                ":ic": {
                    N: "0"
                },
                ":bm": {
                    BOOL: buildingModel
                },
                ":ii": {
                    L: []
                },
                ":ts": {
                    S: day + " At " + time
                }
            }, 
            TableName: TABLE_NAME, 
            Key: {
                "IdentityId": {
                    S: user
                }
            }, 
            ReturnValues: "ALL_NEW",
            UpdateExpression: "SET #D = :ip, #C = :ic, #I = :ii, #R = :bm, #T = :ts"
        };
    }

    
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            // An error occurred, return it to the API
            var message = "Error updating the database: " + err;
            errorHandler(message, callback);
        }
        else {
            
            var hasModel = false;
            if (data.Attributes.hasOwnProperty("LabelData")) {
                hasModel = true;
            }
            var modelTimestamp = "N/A";
            if (data.Attributes.hasOwnProperty("ModelTimestamp")) {
                modelTimestamp = data.Attributes.ModelTimestamp.S;
            }
            processNewImages(user, hasModel, modelTimestamp, callback);
        }
    });
}


// Call a lambda function to process each image individually
function processNewImages(user, hasModel, modelTimestamp, callback) {
    
    // For each image, invoke a Lambda function
    for (var ii = 0; ii < downloadedImages.length; ii++) {
    
        // Prepare the payload
        var payload = {
            IdentityId: user,
            Image: downloadedImages[ii]
        };

        // Prepare the lambda function parameters to process each image
        var params = {
            FunctionName: PROCESS_LAMBDA,
            InvocationType: "Event",
            LogType: "Tail",
            Payload: JSON.stringify(payload)
        };

        // Invoke the lambda function
        lambda.invoke(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            }
            else {
                console.log(data);
            }
        });
    }
    
    // After invocation, return success
    successHandler(downloadedImages.length, hasModel, modelTimestamp, callback);
}

// Fetch images from Instagram using the Instagram API.
function requestNewImageData(user, imageIds, token, max_id, callback) {
    console.log(imageIds);
    // Create the request url
    var requestString = INSTA_PATH + "access_token=" + token;
    if (max_id != null) {
        requestString += "&max_id=" + max_id;
    }
    else {
        max_id = 0;
    }
    
    // Prepare the request
    var options = {
        "method": "GET",
        "hostname": INSTA_ROOT,
        "path": requestString
    };

    // Send out the request
    var req = http.request(options, function (res) {
        var chunks = [];

        res.on("data", function (chunk) {
            chunks.push(chunk);
        });

        res.on("end", function () {
            
            // Prepare the returned data
            var insta_response_raw = Buffer.concat(chunks).toString();
            var insta_response = JSON.parse(insta_response_raw);
            
            console.log(insta_response);
            
            // Check for response errors
            if (!insta_response.hasOwnProperty("data")) {
                var message = "Could not get image data from Instagram request: " + insta_response_raw;
                errorHandler(message, callback);
            }
            
            // Get the array of images and iterate through it
            var images = insta_response["data"];
            for (var ii = 0; ii < images.length; ii++) {
                
                // If the image is not downloaded, add it to the list and downloaded images
                if (imageIds.indexOf(images[ii].id) < 0) {
                    downloadedImages.push(images[ii]);
                }
            }
            
            // Determine whether more images should be downloaded or if its time
            // to process the ones downloaded and save data to dynamo.
            if (!insta_response.pagination.hasOwnProperty("next_max_id")) {
                saveImageData(user, callback);
            }
            else {
                var next_max_id = insta_response.pagination.next_max_id;
                requestNewImageData(user, imageIds, token, next_max_id, callback);
            }
        });
    });

    req.end();
}

// First gets the user's token from the database and attempts to update the
// databases with the user's image information.
function refresh(user, callback) {
    
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
            
            // Check for an access token
            if (data.hasOwnProperty("Item") && data.Item.hasOwnProperty("InstagramToken")) {
                
                var ImageIds = [];
                if (data.Item.hasOwnProperty("InstagramImageId")) {
                    ImageIds = data.Item.InstagramImageId.SS;
                }
                
                // Once the user is retrieved, get the token and start loading image data
                requestNewImageData(user, ImageIds, data.Item.InstagramToken.S, null, callback);
            }
            else {
                var message = "Could not find a token for the user.";
                errorHandler(message, callback);
            }
        }
    });
}

function successHandler(num_images, hasModel, modelTimestamp, callback) {
    
    var isTraining = true;
    if (num_images == 0) {
        isTraining = false;
    }
    
    var response = {
        responseType: "Response",
        numberNewImages: num_images,
        hasModel: hasModel,
        modelTimestamp: modelTimestamp,
        trainingInProgress: isTraining
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

    // Clear the downloaded images
    downloadedImages = [];
    
    var handlerType = event.requestType;
    
    // Verify that the request type is Refresh, otherwise report an error.
    if (handlerType == "Refresh") {
        refresh(event.user, callback);
    }
    else {
        var message = "Invalid GET requestType: " + handlerType + ". Valid types are Refresh.";
            errorHandler(message, callback);
    }
};