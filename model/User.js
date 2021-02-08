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

    editUserDetails(userid, type, userDetails){
        var docClient = this.docClient
        var idField = ''
        if(type == 'user'){
            var table = this.userTable
            idField = 'userid'
        }

        if(type == 'serviceUser'){
            var table = this.engineerTable
            idField = 'serviceUserID'
        }

        if(type == 'admin'){
            var table = this.adminTable
            idField = 'adminUserID'
        }

        var { username, password } = userDetails

        var encryptedPW = this.encryptPassword(password)
        var params = {
            TableName:table,
            Key:{
            },
            UpdateExpression: "set username = :username, password = :password",
            ExpressionAttributeValues:{
                ":username":username,
                ":password":encryptedPW,
            },
            ReturnValues:"UPDATED_NEW"
        };

        params['Key'][idField] = userid
        docClient.update(params, (err, data)=>{
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    getCurrentUser(userid, type){
        var docClient = this.docClient
        var idField = ''
        if(type == 'user'){
            var table = this.userTable
            idField = 'userid'
        }

        if(type == 'serviceUser'){
            var table = this.engineerTable
            idField = 'serviceUserID'
        }

        if(type == 'admin'){
            var table = this.adminTable
            idField = 'adminUserID'
        }
        
        var docClient = this.docClient
        var params = {
            TableName: table,
            Key:{
            }
        };

        params['Key'][idField] = userid
        return new Promise((resolve, reject)=>{
            docClient.get(params, (err, data)=> {
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    let password = data.Item.password
                    let bytes = this.decryptPassword(password)
                    var decryptedPW = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
                    var userDetails = {username: data.Item.username, password: decryptedPW}
                    resolve(userDetails);
                }
            });
        })
    }

    getUserIDFromToken(token){
        var docClient = this.docClient
        var params = {
            TableName : this.accesscontroltable,
            ProjectionExpression: "#token, userid, adminUserID, serviceUserID",
            FilterExpression: "#token=:token",
            ExpressionAttributeNames: {
                "#token": "token",
            },
            ExpressionAttributeValues: {
                 ":token": token
            }
        };
        return new Promise((resolve, reject)=>{
            docClient.scan(params, (err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log(data)
                    var dataItem = data.Items[0].serviceUserID || data.Items[0].adminUserID || data.Items[0].userid
                    resolve(dataItem)
                }
            }) 
        })
    }

    getlastid(type){
        if(type == 'user'){
            var table = this.userTable
        }

        if(type == 'serviceUser'){
            var table = this.engineerTable
        }

        if(type == 'admin'){
            var table = this.adminTable
        }

        var tableName = this.lastIDtable
        var docClient = this.docClient
        var params = {
            TableName: tableName,
            Key:{
                "table" : table
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

    updateLastId(lastid, type){
        var nextid = lastid + 1
        var tableName = this.lastIDtable
        var docClient = this.docClient
        if(type == 'user'){
            var table = this.userTable
        }

        if(type == 'serviceUser'){ 
            var table = this.engineerTable
        }

        if(type == 'admin'){
            var table = this.adminTable
        }

        var params = {
            TableName:tableName,
            Key:{
                "table": table
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

    checkUserExists(username, tableName, idField){
        //if error return false
        //if result return true

        var dynamoClient = this.docClient
        var params = {
            TableName: tableName, // give it your table name 
            ProjectionExpression: "#uname, #password, #uid",
            FilterExpression: "#uname = :username",
            ExpressionAttributeNames: {
                "#uname": "username",
                "#password": "password",
                '#uid': idField
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

    getdynamicTable(type){
        if(type == 'user'){
            var tableName = this.userTable
            var userid = 'userid'
        }

        if(type == 'serviceUser'){
            var tableName = this.engineerTable
            var userid = 'serviceUserID'
        }

        if(type == 'admin'){
            var tableName = this.adminTable
            var userid = 'adminUserID'
        }

        let dynamicObj = {
            "tableName" : tableName,
            "userid" : userid
        }

        return dynamicObj
    }

    async saveNewUser(username, password, type){
        //get last id from another table
        var getdynamicTable = this.getdynamicTable(type)
        var { tableName, userid } = getdynamicTable
        let checkUser = await this.checkUserExists(username, tableName, userid)
        if(checkUser.Count <= 0){
            let getlast = await this.getlastid(type)
            let encryptedPW = this.encryptPassword(password)
            let item = {
                "username" : username,
                "password" : encryptedPW
            }
            item[userid] = getlast.Item.lastid
            //create a record in user table
            var docClient = this.docClient
            var params = {
                TableName:tableName,
                Item: item   
            };
            let newPromise = new Promise((resolve,reject)=>{
                docClient.put(params, (err, data)=>{
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