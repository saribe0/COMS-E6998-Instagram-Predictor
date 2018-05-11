var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

// These two functions convert the JSON to DynamoDB objects
function convertToDynamoMapList(json_object) {
    return {
        "M": convertToDynamoMap(json_object)
    };
}

function convertToDynamoMap(json_object) {
    
    // Iterate through the keys
    for (var key in json_object) {

        // Will become the new object
        var new_obj;
        
        // For each type, process it correctly
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
                break;
            case "number":
                new_obj = {
                    "N": json_object[key].toString()
                };
                break;
            case "object":
                
                if (json_object[key] == null) {
                    new_obj = {
                        "NULL": true
                    };
                }
                else if (Array.isArray(json_object[key])) {
                    if (json_object[key].length > 0 && typeof(json_object[key][0]) == "string") {
                        new_obj = {
                            "SS": json_object[key]
                        };
                    }
                    else if (json_object[key].length > 0 && typeof(json_object[key][0]) == "number") {
                        new_obj = {
                            "NS": json_object[key].map(x => x.toString())
                        };
                    }
                    else if (json_object[key].length > 0 ) {
                        new_obj = {
                            "L": json_object[key].map(x => convertToDynamoMapList(x))
                        };
                    }
                    else {
                        new_obj = {
                            "SS": ["-"]
                        };
                    }
                }
                else {
                    new_obj = {
                        "M": convertToDynamoMap(json_object[key])
                    };
                }
        }
        json_object[key] = new_obj;
    }
    
    return json_object;
}

function saveLabelData(user, labelData, callback) {
    
    var d = new Date();
    var time = d.toLocaleTimeString();
    var day = d.toLocaleDateString();
    
    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#L": "LabelData",
            "#C": "ImagesCompleted",
            "#P": "ImagesProcessing",
            "#R": "BuildingModel",
            "#T": "ModelTimestamp"
        }, 
        ExpressionAttributeValues: {
            ":ld": {
                M: labelData
            },
            ":ic": {
                N: "0"
            },
            ":ip": {
                N: "0"
            },
            ":bm": {
                BOOL: false
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
        UpdateExpression: "SET #L = :ld, #C = :ic, #P = :ip, #R = :bm, #T = :ts"
    };
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            console.log(err, err.stack);
            
            // An error occurred, return it to the API
            var message = "Error updating the database with label data: " + err;
            errorHandler(message, callback);
        }
        else {
            
            // Report success
            var message = "Successfully updated and stored label data"
            successHandler(message, callback);
        }
    });
}

// Once all the images for that request have been analyzed, this function
// updates the list of tags which is later used when determining an images
// estimated results
function consolidateTags(user, userAttributes, callback) {

    // Keep track of all the labels in an object
    var labelData = {};
    
    console.log("Consolidating tags into label data");
    
    // Iterate through the images the user has
    for(var ii = 0; ii < userAttributes.InstagramImages.L.length; ii++) {
        
        // Get the image
        var currentImage = userAttributes.InstagramImages.L[ii].M;
        
        // Likes and comments for the image
        var likes = parseInt(currentImage.likes.M.count.N, 10);
        var comments = parseInt(currentImage.comments.M.count.N, 10);
        
        // The labels for the image
        if (!currentImage.hasOwnProperty("RekognitionLabels")) {
            continue;
        }
        var imageLabels = currentImage.RekognitionLabels.M.Labels.L;
        
        // For each image, go through all of its labels
        for(var jj = 0; jj < imageLabels.length; jj++) {
            
            // Get the labe properties
            var label = imageLabels[jj].M.Name.S;
            //var confidence = parseInt(imageLabels[jj].M.Confidence.N, 10);
            
            // Get the label and determine it's weighted values
            var likes_w = likes;
            var comments_w = comments;
            
            // Update the average weight for the label in the label data object
            if (labelData.hasOwnProperty(label)) {
                
                // Determine the old weighted value
                var likes_total = labelData[label].likes_average * labelData[label].count;
                var comments_total = labelData[label].comments_average * labelData[label].count;
                
                // Update the count
                labelData[label].count += 1;
                
                // Updated the averages
                labelData[label].likes_average = (likes_total + likes_w) / labelData[label].count;
                labelData[label].comments_average = (comments_total + comments_w) / labelData[label].count;
            }
            // If the label isn't in the object, add and initialize it
            else {
                labelData[label] = {
                    count: 1,
                    likes_average: likes_w,
                    comments_average: comments_w
                };
            }
            
        }
    }
    
    
    
    // Now that all the labels have been determined, convert to a format 
    // DynamoDB likes
    var dynamoLabelData = convertToDynamoMap(labelData);
    
    // Save the label data 
    saveLabelData(user, dynamoLabelData, callback);
}

function getUserAttributesFromDynamo(user, callback) {
    
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
            
            // When successful, call the consolidate function
            consolidateTags(user, data.Item, callback);
        }
    });
}

function successHandler(message, callback) {
    var response = {
        responseType: "Response",
        message: message
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
    if (requestHandler != "BuildModel") {
        var message = "Error: Invalid request type.";
        errorHandler(message, callback);
    }
    
    // If user attributes were supplied, go right to consolidating tags
    // and building the model.
    if (event.hasOwnProperty("userAttributes") && event.userAttributes != null) {
        consolidateTags(event.user, event.userAttributes, callback);
    }
    // Otherwise, get them from the user
    else {
        getUserAttributesFromDynamo(event.user, callback);
    }
    
};