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
        this.livedocClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'ap-southeast-1',
                accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
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

    getUserNameFromToken(token){
        var livedocClient = this.livedocClient
        var params = {
            TableName: this.accesscontroltable,
            Key:{
                "token" : token
            }
        };
        return new Promise((resolve,reject)=>{
            livedocClient.get(params, async(err, data)=>{
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
                    resolve(userDetails)
                }
            });
        })
    }

    checkToken(token, type){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient        
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
            livedocClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(data.Count)
                }
            })
        });
    }

    insertAccessControlToken(userid, token, idField){
        var tableName = this.accesscontroltable
        var livedocClient = this.livedocClient

        let item = {
            "valid" : true,
            "token" : token
        }

        item[idField] = userid

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
                        let userDetails = result.Items[0]
            //             //save token in accesscontrol table
                        this.insertAccessControlToken(userDetails[userid], token, userid)
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
                console.log(err)
            })
        })
    }
}

module.exports = Authetication