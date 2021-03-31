const CryptoJS = require("crypto-js");
const AWS = require("aws-sdk");

class User{
    constructor(){
        this.key = 'mwPWxZ4caYNzENpCBpWzMYxy4dMetJ743qNebkJh',
        this.docClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'us-east-2',
                accessKeyId: 'AKIA47VGGTAQQJKET2X7',
                secretAccessKey: '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'
            }
        ),
        this.livedocClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'ap-southeast-1',
                accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
                secretAccessKey: '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'
            }
        ),
        this.userTable = 'user',
        this.engineerTable = 'serviceUser',
        this.adminTable = 'adminUser',
        this.lastIDtable = 'lastID'
        this.accesscontroltable = 'accesscontroltable'
    }

    addNewUser(uDetail){
        var { username, password, userType} = uDetail
        
    }

    getUserDetails(userid){
        var tableName = 'users'
        //marka
        var livedocClient = this.livedocClient
        var params = {
            TableName: tableName,
            Key:{
                "id" : userid
            }
        };
        return new Promise((resolve,reject)=>{
            livedocClient.get(params, (err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    resolve(data)
                }
            });
        }) 
    }

    async getListofTokens(){
        //tokenmark
        var livedocClient = this.livedocClient
        var tableName = 'accesscontroltable'
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
                        if(dI.valid){
                            return dI.token
                        }
                    })
                    resolve(dataItems)
                 }
            })
        });
    }

    async editUser(userid, uDetails){
        var { username, password, userType} = uDetails
        var livedocClient = this.livedocClient
        var updateExpression = "set username = :username, userType = :userType, password = :password"
       
        var tableName = 'users'
        if(password.length <= 0){
            updateExpression = "set username = :username, userType = :userType"
            var expressionObj = {
                ":username" : username,
                ":userType" : userType
            }
        }else{
            let encryptedPW = this.encryptPassword(password)
            var expressionObj = {
                ":username" : username,
                ":userType" : userType,
                ":password" : encryptedPW
            }
        }
        var params = {
            TableName:tableName,
            Key:{
                "id": userid
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionObj,
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

    async getListofUsers(){
        var livedocClient = this.livedocClient
        var tableName = 'users'
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
                    resolve(dataItems)
                 }
            })
        });
    }
    async getListofInvalidTokens(){
        //tokenmark
        var livedocClient = this.livedocClient
        var tableName = 'accesscontroltable'
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
                        if(!dI.valid){
                            return dI.token
                        }
                    })
                    resolve(dataItems)
                 }
            })
        });
    }

    getuserIDFromUserName(username){
        var livedocClient = this.livedocClient
        var tableName = 'users'
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
                    dataItems = dataItems.map((user)=>{
                        if(user.username == username){
                            return user.id
                        }
                    })
                    resolve(dataItems)
                 }
            })
        });
    }

    getlastid(){

        var tableName = this.lastIDtable
        //marka
        var livedocClient = this.livedocClient
        var params = {
            TableName: tableName,
            Key:{
                "table" : 'users'
            }
        };
        return new Promise((resolve,reject)=>{
            livedocClient.get(params, (err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    resolve(data)
                }
            });
        }) 
    }

    updateLastId(lastid){

        var nextid = parseInt(lastid) + 1
        nextid = nextid.toString()
        var tableName = this.lastIDtable

        var livedocClient = this.livedocClient

        var params = {
            TableName:tableName,
            Key:{
                "table": 'users'
            },
            UpdateExpression: "set lastid = :lastid",
            ExpressionAttributeValues:{
                ":lastid":nextid,
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

    checkUserExists(username){
        //if error return false
        //if result return true

        var dynamoClient = this.livedocClient
        var params = {
            TableName: 'users', // give it your table name 
            ProjectionExpression: "#uname, #password, #userType, #id",
            FilterExpression: "#uname = :username",
            ExpressionAttributeNames: {
                "#uname": "username",
                "#password": "password",
                "#userType": "userType",
                "#id": "id",
            },
            ExpressionAttributeValues: {
                ":username": username
            }
        };
    
        return new Promise((resolve, reject)=>{
            dynamoClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        });
    }

    async saveNewUser(username, password, type){
        
        var tableName = 'users'
        let checkUser = await this.checkUserExists(username)
        if(checkUser.Count <= 0){
            let getlast = await this.getlastid()
            let encryptedPW = this.encryptPassword(password)
            let item = {
                "username" : username,
                "password" : encryptedPW
            }
            var currentID = getlast.Item.lastid
            currentID = currentID.toString()
            item['id'] = currentID
            item['userType'] = type
            //create a record in user table
            var livedocClient = this.livedocClient
            var params = {
                TableName:tableName,
                Item: item   
            };
            //marka
            let newPromise = new Promise((resolve,reject)=>{
                livedocClient.put(params, (err, data)=>{
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            })

            this.updateLastId(getlast.Item.lastid, type)
            return newPromise
        }else{
            return false;
        }
    }

    async emailRecipients(){
        var tableName = 'EmailRecipients'

        var dynamoClient = this.livedocClient
        var params = {
          TableName: tableName, // give it your table name 
          Select: "ALL_ATTRIBUTES"
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

    encryptPassword(password){
        let ciphertext = CryptoJS.AES.encrypt(JSON.stringify(password), this.key).toString();
        return ciphertext
    }

    decryptPassword(encryptPassword){
        let decryptedPW = CryptoJS.AES.decrypt(encryptPassword, this.key);
        return decryptedPW
    }
}

module.exports = User