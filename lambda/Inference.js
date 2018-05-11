var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB();
var s3 = new AWS.S3();
var rekognition = new AWS.Rekognition();

// Dynamo Database Info
var TABLE_NAME = "InstaAnalysis";

// S3 Bucket Name
var BUCKET_NAME = "image-analysis-storage";

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

function inferImageResponse(userData, newImage, callback) {
    
    // First make sure the user's previous labels can be obtained
    if(!userData.hasOwnProperty("LabelData")) {
        var message = "Error, user does not have a model to preform inference on.";
        errorHandler(message, callback);
    }
    
    // Variables to keep track of total likes, comments, and images
    var totalLikes = 0;
    var totalComments = 0;
    var totalSamples = 0;
    
    // For each label in the new image, see if it exists in the big array
    var modelData = userData.LabelData.M;
    var labelSets = newImage.RekognitionLabels.L;
    for (var ii = 0; ii < labelSets.length; ii++) {
        
        // Get the name of the label
        var name = labelSets[ii].M.Name.S;
        
        // If the label is in the model data, update the counting variables
        if (modelData.hasOwnProperty(name)) {
            var count = parseInt(modelData[name].M.count.N);
            totalLikes += (parseInt(modelData[name].M.likes_average.N) * count);
            totalComments += (parseInt(modelData[name].M.comments_average.N) * count);
            totalSamples += count;
            
            console.log(totalLikes);
            console.log(totalComments);
            console.log(totalSamples);
        }
    }
    
    // Determine the average likes and comments for the new image's labels
    var avgLikes = totalLikes / totalSamples;
    var avgComments = totalComments / totalSamples;
    
    var message = "Successfully analyzed image and determined a prediction."
    successHandler(message, avgLikes, avgComments, callback);
}

// Updates the database with the image and gets the user to analyze.
function saveImageData(user, imageData, callback) {

    var listImage = [{
        "M": imageData
    }];

    // Prepare paramters
    var params = {
        ExpressionAttributeNames: {
            "#I": "InferenceImages"
        }, 
        ExpressionAttributeValues: {
            ":im": {
                L: listImage
            },
            ":el": {
                "L": []
            }
        }, 
        TableName: TABLE_NAME, 
        Key: {
            "IdentityId": {
                S: user
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #I = list_append(if_not_exists(#I, :el), :im)"
    };
    
    // Update item is used because it will create the item if not found and
    // update the required fields if it is. It also returns the new user which
    // is used to preform inference.
    dynamodb.updateItem(params, function(err, data) {
        if (err) {
            
            console.log(err, err.stack);
            
            // An error occurred, return it to the API
            var message = "Could not get model from the database: " + err;
            errorHandler(message, callback);
        }
        else {
            
            // Infer the image's response
            inferImageResponse(data.Attributes, imageData, callback);
        }
    });
}

// Send the image to Rekognition and get a list of labels for it
function analyzeImage(user, imageKey, callback) {

    // Prepare the request
    var params = {
        Image: {
            S3Object: {
                Bucket: BUCKET_NAME, 
                Name: imageKey
            }
        }, 
        MaxLabels: 100, 
        MinConfidence: 50
    };
    
    // Get tags for the image
    rekognition.detectLabels(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            var message = "Unable to get labels from Rekognition for the image: " + err;
            errorHandler(message, callback);
        }
        else {
            
            if (!data.hasOwnProperty("Labels")) {
                var message = "Unable to get labels from Rekognition for the image: " + JSON.stringify(data);
                errorHandler(message, callback);
            }
            
            var imageData = {
                ImageKey: imageKey,
                RekognitionLabels: data.Labels
            };
            
            // Add the image data to Dynamo
            var dynamoFormatted = convertToDynamoMap(imageData);
            
            // Save the image data
            saveImageData(user, dynamoFormatted, callback);
        }
    });
}

// Uploads the image to S3 in the user's folder
function uploadImageToS3(user, image, callback) {
    
    // Get the name and type of the image
    try {
        var image_type = image.split("/")[1].split(";")[0];
        var image_name = Date.now().toString();
        var image_data = new Buffer(image.split("base64,")[1], 'base64');
    }
    catch(err) {
        var message = "Could not extract image from image parameter: " + err.message;
        errorHandler(message, callback);
    }
    
    var image_key = user + "/uploaded_images/" + image_name + "." + image_type;
    
    // Prepare put request
    var params = {
        Bucket: BUCKET_NAME,
        Body: image_data,
        ContentEncoding: 'base64',
        ContentType: 'image/' + image_type,
        Key: image_key
    };
    
    s3.putObject(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            // If there is an error, return it
            var message = "Could not upload the image to S3: " + err;
            errorHandler(message, callback);
        }
        else { 
            // Once the image is uploaded to S3, call Rekognition 
            // to analyze the image
            analyzeImage(user, image_key, callback);
        }
    });
}

function successHandler(message, likes, comments, callback) {
    var response = {
        responseType: "Response",
        message: message,
        prediction: {
            likes: likes,
            comments: comments
        }
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
    
    // First verify the request is for inference
    var requestHandler = event.requestType;
    
    // Handle an invalid input
    if (requestHandler != "AnalyzeImage") {
        var message = "Invalid request type.";
        errorHandler(message, callback);
    }
    if (!event.hasOwnProperty("image")) {
        var message = "No image provided to preform inference on.";
        errorHandler(message, callback);
    }
    
    // Upload the file to S3
    uploadImageToS3(event.user, event.image, callback);
};