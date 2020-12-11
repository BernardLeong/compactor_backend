const AWS = require("aws-sdk");
const moment = require('moment')
const env = require('dotenv').config()
class Alarm{

    constructor(alarmTable){
        this.docClient = new AWS.DynamoDB.DocumentClient(
            {
                region: process.env.REGION,
                accessKeyId: process.env.ACCESSKEYID,
                secretAccessKey: process.env.SECRETACCESSKEY
            }
        );
        this.compactInfoTable = 'CompactorInfo'
        this.alarmTable = alarmTable
        this.alarmInfoTable = 'AlarmInfo'
        this.lastID = 'lastID'
    }

    clearAlarm(alarmID){
        var docClient = this.docClient
        var status = 'Clear'
        var params = {
            TableName: this.alarmInfoTable,
            Key:{
                "AlarmID" : alarmID
            },
            UpdateExpression: "set alarmStatus = :alarmStatus",
            ExpressionAttributeValues:{
                ":alarmStatus": status
            },
            ReturnValues:"UPDATED_NEW"
        };
        return new Promise((resolve, reject)=>{
            docClient.update(params, (err, data)=>{
                if (err) {
                    reject("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    resolve(data);
                }
            });
        })
    }

    getAlarm(compactorID){
        var docClient = this.docClient

        var params = {
            TableName: this.alarmInfoTable,
            Select: "ALL_ATTRIBUTES",
            FilterExpression: "#compactorID = :compactorID",
            ExpressionAttributeNames: {
                "#compactorID": "compactorID"
            },
            ExpressionAttributeValues: {
                 ":compactorID": compactorID,
            }
        };

        return new Promise((resolve, reject)=>{
            docClient.scan(params, (err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    resolve(data.Items)
                }
            }) 
        })
    }

    getAllAlarm(){
        var tableName = this.alarmInfoTable 
        
        var dynamoClient = this.docClient
        var params = {
          TableName: tableName, // give it your table name 
          Select: "ALL_ATTRIBUTES"
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

    getPrefixedAlarmID(){
        var docClient = this.docClient
        var params = {
            TableName: this.lastID,
            Key:{
                "table" : this.alarmInfoTable
            }
        };
        return new Promise((resolve, reject)=>{
            docClient.get(params, (err, data)=>{
                if (err) {
                    reject(err)
                } else {
                    // resolve(data)
                    var lastid = data.Item.lastid
                    var prefix = 'AL'
                    var alarmid = ''
                    switch(true) {
                        case lastid <= 9999 && lastid >= 1000:
                          //must be 0001
                            alarmid = `${prefix}${lastid}`
                        break;
                        case lastid <= 999 && lastid >= 100:
                          //must be 0001
                            alarmid = `${prefix}0${lastid}`
                        break;
                        case lastid <= 99 && lastid >= 10:
                            alarmid = `${prefix}00${lastid}`
                        break;
                        case lastid <= 10:
                            alarmid = `${prefix}000${lastid}`
                        break;
                        default :
                            alarmid = `${prefix}${lastid}`
                    }
                    resolve({prefix: alarmid, lastid: lastid})
                }
            });
        })
    }

    async createAlarm(compactorID, alarmDetails){
        var docClient = this.docClient
        var { type, status, userid, address } = alarmDetails
        var { prefix, lastid } = await this.getPrefixedAlarmID()

        var params = {
            TableName: this.alarmInfoTable,
            Item:{
                "AlarmID" : prefix,
                "compactorID": compactorID,
                "timeStamp" : Date.now(),
                "status" : status,
                "type" : type,
                "userid" : userid,
                "address" : address,
                "humanReadableTS" : moment().format('LLLL')
            }
        };
        docClient.put(params, (err, data)=>{
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added items:", JSON.stringify(data, null, 2));
            }
        });

        this.updateAlarmInfoLastID(lastid)
    }

    updateAlarmInfoLastID(lastid){
        var docClient = this.docClient
        var newLastID = lastid + 1
        var params = {
            TableName: this.lastID,
            Key:{
                "table" : this.alarmInfoTable
            },
            UpdateExpression: "set lastid = :lastid",
            ExpressionAttributeValues:{
                ':lastid' : newLastID,
            },
            ReturnValues:"UPDATED_NEW"
        };
        docClient.update(params, (err, data)=>{
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item:", JSON.stringify(data, null, 2));
            }
        });
    }

    updateCompactorInfoAlarm(compactorID,alarmDetails){
        var docClient = this.docClient
        var { type, status } = alarmDetails
        var params = {
            TableName: this.compactInfoTable,
            Key:{
                "compactorID" : compactorID
            },
            UpdateExpression: "set alarm = :alarm",
            ExpressionAttributeValues:{
                ":alarm":{
                    'type' : type,
                    'status' : status,
                    'last_update' : Date.now(),
                },
            },
            ReturnValues:"UPDATED_NEW"
        };
        docClient.update(params, (err, data)=>{
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item:", JSON.stringify(data, null, 2));
            }
        });
    }

    raisedAlarm(compactorID,alarmDetails){
        if(compactorID){
            //if alarm is raised create record
            this.createAlarm(compactorID,alarmDetails)
            //find record in CompactorInfo table and update the alarm fields
            this.updateCompactorInfoAlarm(compactorID,alarmDetails)
        }else{
            return;
        }
    }
}

module.exports = Alarm