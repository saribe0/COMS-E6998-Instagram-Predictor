var https = require('https');
var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();
var s3 = new AWS.S3();
var rekognition = new AWS.Rekognition();
var lambda = new AWS.Lambda();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

// S3 Bucket Name
var BUCKET_NAME = "image-analysis-storage";

// Lambda Function Name
var BUILD_LAMBDA = "InstaAnalysis-BuildML";

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

function buildModel(user, userAttributes, callback) {
    
    // Make sure model has not been cancelled
    if (!userAttributes.BuildingModel.BOOL) {
        var message = "Error: Model has been cancelled.";
        errorHandler(message, callback);
    }
    
    var payload = {
        user: user,
        requestType: "BuildModel",
        userAttributes: userAttributes
    };
    
    // Prepare the lambda function to build the model
    var params = {
        FunctionName: BUILD_LAMBDA,
        InvocationType: "Event",
        LogType: "Tail",
        Payload: JSON.stringify(payload)
    };

    // Invoke the lambda function
    lambda.invoke(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            var message = "Error: Image processing complete but unable to rebuild model.";
            errorHandler(message, callback);
        }
        else {
            console.log(data);
            var message = "Succesfully processed images and requested a model rebuild.";
            successHandler(message, callback);
        }
    });
}

// Updates the database with new image ids after the update was run.
function saveImageData(user, imageData, callback) {

    var listImages = [{
        "M": imageData
    }];

    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#I": "InstagramImages",
            "#C": "ImagesCompleted",
            "#D": "InstagramImageId"
        }, 
        ExpressionAttributeValues: {
            ":im": {
                L: listImages
            },
            ":ic": {
                N: "1"
            },
            ":id": {
                SS: [imageData.id.S]
            }
        }, 
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #I = list_append(#I, :im), #C = #C + :ic ADD #D :id"
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
        
            // Check on the progress of the processing job
            var completed = parseInt(data.Attributes.ImagesCompleted.N, 10);
            var processing = parseInt(data.Attributes.ImagesProcessing.N, 10);
            
            if ( completed >= processing ) {
                buildModel(user, data.Attributes, callback);
            }
            else {
                var message = "Image " + completed.toString() + " was succesfully analyzed.";
                successHandler(message, callback);
            }
        }
    });
}

// Even on error, the DynamoDB processing counter should be updated
function incrementCounter(user, callback) {
    
    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#C": "ImagesCompleted"
        }, 
        ExpressionAttributeValues: {
            ":ic": {
                N: "1"
            }
        }, 
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        },
        UpdateExpression: "SET #C = #C + :ic"
    };
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            console.log(err, err.stack);
            
            // An error occurred, return it to the API
            var message = "Error: image not processed and counter not updated in database: " + err;
            errorHandler(message, callback);
        }
        else {
        
            // An error still occured
            var message = "Error: Counter updated but unable to process image";
            errorHandler(message, callback);
        }
    });    
}

function analyzeImage(user, imageData, callback) {

    // Prepare the request
    var params = {
        Image: {
            S3Object: {
                Bucket: BUCKET_NAME, 
                Name: user + "/posted_images/" + imageData.id.S + ".jpg"
            }
        }, 
        MaxLabels: 100, 
        MinConfidence: 50
    };
    
    // Get tags for the image
    rekognition.detectLabels(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            incrementCounter(user, callback);
        }
        else {
            
            // Add the tags to the image data structure
            var dynamoFormatted = convertToDynamoMap(data);
            imageData["RekognitionLabels"] = { "M": dynamoFormatted };
            
            // Save the image data
            saveImageData(user, imageData, callback);
        }
    });
}

// Uploads the image to S3 in the user's folder
function uploadImageToS3(user, imageData, binaryImageString, callback) {
    
    // Prepare put request
    var params = {
        Bucket: BUCKET_NAME,
        Body: binaryImageString,
        Key: user + "/posted_images/" + imageData.id.S + ".jpg"
    };
    
    s3.putObject(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            // Even if there is an error with the image, increment the dynamo counter
            incrementCounter(user, callback);
        }
        else { 
            // Once the image is uploaded to S3, upload the image data to dynamo
            analyzeImage(user, imageData, callback);
        }
    });
}

// Downloads the image from instagram
function downlaodImage(user, imageData, callback) {
                                                  
    // Get the url from the imageData
    var url = imageData.images.M.standard_resolution.M.url.S;
    
    // Send the request to download the image
    var req = https.request(url, function(response) {                                        
        var chunks = [];
        
        response.on('error', function(err) {
            console.log(err);
            // Even if there is an error with the image, increment the dynamo counter
            incrementCounter(user, callback);
        });
    
        response.on('data', function(chunk) {                                       
            chunks.push(chunk);                                                         
        });                                                                         
    
        response.on('end', function() {                                             
            
            // Create binary string from the image
            var bin_string = Buffer.concat(chunks);
            
            // Upload the image to S3
            uploadImageToS3(user, imageData, bin_string, callback);
        });                                                                         
    });
    
    req.end();
}

function successHandler(num, callback) {
    var response = {
        responseType: "Response",
        numberNewImages: num
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
    
    var dynamoReady = convertToDynamoMap(event.Image);
    
    downlaodImage(event.IdentityId, dynamoReady, callback);
};