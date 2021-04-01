const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js");
const AWS = require("aws-sdk");
const User = require("./User")
const env = require('dotenv').config()

class Authetication{

    constructor(){
        this.tokenSign = '6jFLnuPANxk4UzePcRSTRkwXSqxhAMf2FAm4VFvV',
        this.encrypytkey = 'mwPWxZ4caYNzENpCBpWzMYxy4dMetJ743qNebkJh',
        this.userTable = 'users',
        this.lastID = 'lastID',
        this.accesscontroltable = 'accesscontroltable',
        this.apikeyTable = 'apiKeys',
        this.livedocClient = new AWS.DynamoDB.DocumentClient(
            {
                region: process.env.REGION,
                accessKeyId: process.env.ACCESSKEYID,
                secretAccessKey: process.env.SECRETACCESSKEY
            }
        )
    }

    async getAPIKeys(apikey){
        //apikey
        var livedocClient = this.livedocClient
        var tableName = this.apikeyTable
        var params = {
          TableName: tableName, // give it your table name 
          Select: "ALL_ATTRIBUTES"
        };
      
        return new Promise((resolve, reject)=>{
            livedocClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                 } else {
                    var dataItems = data.Items
                    dataItems = dataItems.map((dI)=>{
                        if(dI.apiKey === apikey){
                            return {apiKey: dI.apiKey , type: dI.type }
                        }
                    })
                    dataItems = dataItems.filter(Boolean)
                    resolve(dataItems)
                 }
            })
        });
    }
    
    signToken(username, password){
            var token = jwt.sign({ 
                'username': username,
                'password': password
            }, this.tokenSign
        );
        return token
    }

    async getUserNameFromToken(token){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient

        var params = {
            TableName: tableName,
            Key:{
                "token" : token
            }
        };
        var params = {
            TableName: tableName, // give it your table name 
            ProjectionExpression: "#token, #userid",
            FilterExpression: "#token = :token",
            ExpressionAttributeNames: {
                "#userid": "userid",
                "#token": "token",
            },
            ExpressionAttributeValues: {
                ":token": token
            }
        };
    
        return new Promise((resolve, reject)=>{
            livedocClient.scan(params, async(err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    var userid = data.Items[0]
                    userid = userid.userid
                    let username = await this.getUserNameFromID(userid)
                    var uDetails = {
                        userid: userid,
                        username : username
                    }
                    resolve(uDetails)
                }
            })
        });
    }

    async getUserNameFromID(userid){
        var tableName = this.userTable
        var livedocClient = this.livedocClient

        var params = {
            TableName: tableName,
            Key:{
                "id" : userid
            }
        };
        var params = {
            TableName: tableName, // give it your table name 
            ProjectionExpression: "#username, #id",
            FilterExpression: "#id = :id",
            ExpressionAttributeNames: {
                "#username": "username",
                "#id": "id",

            },
            ExpressionAttributeValues: {
                ":id": userid
            }
        };
    
        return new Promise((resolve, reject)=>{
            livedocClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    var username = data.Items[0]
                    username = username.username
                    resolve(username)
                }
            })
        });
    }

    checkToken(token){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient        

        var params = {
            TableName: tableName, // give it your table name 
            ProjectionExpression: "#token",
            FilterExpression: "#token = :token",
            ExpressionAttributeNames: {
                "#token": "token",
            },
            ExpressionAttributeValues: {
                ":token": token
            }
        };
    
        return new Promise((resolve, reject)=>{
            livedocClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(data.Count)
                }
            })
        });
    }

    insertAccessControlToken(userid, token){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient

        let item = {
            "valid" : true,
            "token" : token,
            "userid" : userid
        }

        var params = {
            TableName:tableName,
            Item:item
        };

        return new Promise((resolve,reject)=>{
            livedocClient.put(params, (err, data)=>{
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        })
    }

    deleteToken(token){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient
        var params = {
            TableName:tableName,
            Key:{
                "token": token
            },
        };
        livedocClient.delete(params, (err, data)=> {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    invalidateToken(token){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient
        var params = {
            TableName:tableName,
            Key:{
                "token": token
            },
            UpdateExpression: "set valid = :valid",
            ExpressionAttributeValues:{
                ":valid":false,
            },
            ReturnValues:"UPDATED_NEW"
        };
        livedocClient.update(params, (err, data)=>{
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    async autheticate(username, password){
        let user = new User
        return new Promise((resolve, reject)=>{
            user.checkUserExists(username).then(async(result)=>{
                // console.log(result)
                if(result.Count > 0){
                    var bytes  = CryptoJS.AES.decrypt(result.Items[0].password, this.encrypytkey);
                    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                    if(username === result.Items[0].username && password === decryptedData){
                        var token = this.signToken(username, password)
                        let userDetails = result.Items[0]
            //             //save token in accesscontrol table
                        var userid = userDetails.id
                        this.insertAccessControlToken(userid, token)
                            resolve(
                                {
                                    "success" : true,
                                    "token" : token,
                                    "usertype" : userDetails.userType
                                }
                            )
                    }else{
                            reject(
                                {
                                    "success" : false,
                                    "error" : "Wrong password or user"
                                }
                            )
                    }
                }else{
                    resolve(
                        {
                            "success" : false,
                            "error" : "Wrong password or user"
                        }
                    )
                }
            }).catch((err)=>{
                console.log(err)
            })
        })
    }
}

// let auth = new Authetication
// let getUserNameFromToken = auth.getUserNameFromToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImJlcm5hcmQiLCJwYXNzd29yZCI6ImFzZGZhc2RmIiwiaWF0IjoxNjE2OTg1ODA1fQ.W343CONGt3fa6xovCqHonm3SjVdcz7bwkwsQc_yAuak")

// getUserNameFromToken.then((result)=>{
//     console.log(result)
// })
module.exports = Authetication