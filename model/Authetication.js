const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js");
const AWS = require("aws-sdk");
const User = require("./User")

class Authetication{

    constructor(){
        this.tokenSign = '6jFLnuPANxk4UzePcRSTRkwXSqxhAMf2FAm4VFvV',
        this.encrypytkey = 'mwPWxZ4caYNzENpCBpWzMYxy4dMetJ743qNebkJh',
        this.userTable = 'user',
        this.lastID = 'lastID',
        this.accesscontroltable = 'accesscontroltable'
        this.dynamoClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'us-east-2',
                accessKeyId: 'AKIA47VGGTAQQJKET2X7',
                secretAccessKey: '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'
            }
        );
    }
    signToken(username, password){
            var token = jwt.sign({ 
                'username': username,
                'password': password
            }, this.tokenSign
        );
        return token
    }

    getIDFromToken(token, type){
        var tableName = this.accesscontroltable
        var dynamoClient = this.dynamoClient
        var idField = 'userid'
        if(type == 'admin'){
            idField = 'adminUserID'
        }
        if(type == 'serviceUser'){
            idField = 'serviceUserID'
        }

        var params = {
            TableName: tableName, // give it your table name 
            ProjectionExpression: "#token, #uid",
            FilterExpression: "#token = :token",
            ExpressionAttributeNames: {
                "#token": "token",
                '#uid': idField
            },
            ExpressionAttributeValues: {
                ":token": token
            }
        };
    
        return new Promise((resolve, reject)=>{
            dynamoClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(data.Items)
                }
            })
        });
    }

    getUserNameFromToken(token){
        var docClient = this.dynamoClient
        var params = {
            TableName: this.accesscontroltable,
            Key:{
                "token" : token
            }
        };
        return new Promise((resolve,reject)=>{
            docClient.get(params, async(err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    var type = 'user'
                    var userid = ''

                    if(data.Item.adminUserID){
                        type = 'admin'
                        userid = data.Item.adminUserID
                    }else if(data.Item.serviceUserID){
                        type = 'serviceUser'
                        userid = data.Item.serviceUserID
                    }else{
                        userid = data.Item.userid
                    }
                    let user = new User
                    let userDetails = await user.getCurrentUser(userid, type)
                    // userDetails
                    var { username } = userDetails
                    resolve(username)
                }
            });
        })
    }

    checkToken(token, type){
        var tableName = this.accesscontroltable
        var dynamoClient = this.dynamoClient
        var idField = 'userid'
        if(type == 'admin'){
            idField = 'adminUserID'
        }
        if(type == 'serviceUser'){
            idField = 'serviceUserID'
        }

        var params = {
            TableName: tableName, // give it your table name 
            ProjectionExpression: "#token, #uid",
            FilterExpression: "#token = :token",
            ExpressionAttributeNames: {
                "#token": "token",
                '#uid': idField
            },
            ExpressionAttributeValues: {
                ":token": token
            }
        };
    
        return new Promise((resolve, reject)=>{
            dynamoClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(data.Count)
                }
            })
        });
    }

    getAccessControlTokenLastID(){
        var docClient = this.dynamoClient
        var params = {
            TableName: this.lastID,
            Key:{
                "table" : this.accesscontroltable
            }
        };
        return new Promise((resolve,reject)=>{
            docClient.get(params, (err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    resolve(data)
                }
            });
        }) 
    }

    updateAccessLastID(lastid){
        var nextid = lastid + 1
        var tableName = this.lastID
        var docClient = this.dynamoClient
        var params = {
            TableName:tableName,
            Key:{
                "table": this.accesscontroltable
            },
            UpdateExpression: "set lastid = :lastid",
            ExpressionAttributeValues:{
                ":lastid":nextid,
            },
            ReturnValues:"UPDATED_NEW"
        };
        docClient.update(params, (err, data)=>{
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    insertAccessControlToken(accesslastid, userid, token, idField){
        var tableName = this.accesscontroltable
        var docClient = this.dynamoClient


        let item = {
            "id": accesslastid,
            "valid" : true,
            "token" : token
        }

        item[idField] = userid

        var params = {
            TableName:tableName,
            Item:item
        };

        return new Promise((resolve,reject)=>{
            docClient.put(params, (err, data)=>{
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        })
    }

    invalidateToken(token){
        var tableName = this.accesscontroltable
        var docClient = this.dynamoClient

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
        docClient.update(params, (err, data)=>{
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    async autheticate(username, password, type){
        let user = new User
        return new Promise((resolve, reject)=>{
            let dynamicTable = user.getdynamicTable(type)
            var { tableName, userid } = dynamicTable
            user.checkUserExists(username, tableName, userid).then(async(result)=>{
                // console.log(result)
                if(result.Count > 0){
                    var bytes  = CryptoJS.AES.decrypt(result.Items[0].password, this.encrypytkey);
                    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                    if(username === result.Items[0].username && password === decryptedData){
                        var token = this.signToken(username, password)
            //             //get last id
                        let accesscontroltoken = await this.getAccessControlTokenLastID()
                        let accesslastid = accesscontroltoken.Item.lastid
                        let userDetails = result.Items[0]
            //             //save token in accesscontrol table
                        this.insertAccessControlToken(accesslastid, userDetails[userid], token, userid)
            //             //increase lastid
                        this.updateAccessLastID(accesslastid)
                            resolve(
                                {
                                    "success" : true,
                                    "token" : token
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
                
            })
        })
    }
}

let auth = new Authetication
var getUserNameFromToken = auth.getUserNameFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InNvbXJjcmkiLCJwYXNzd29yZCI6ImFzZGZhc2RmIiwiaWF0IjoxNjA3MzE0ODE0fQ.DF4GH1QS3FjLHer0AVTVy0wATedIZQ7I02viygziz6Q')
getUserNameFromToken.then((result)=>{
    console.log(result)
})

module.exports = Authetication