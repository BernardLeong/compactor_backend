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
    }

    getAlarm(compactorID){
        var docClient = this.docClient
        var params = {
            TableName: this.alarmInfoTable,
            Key:{ 
                "compactorID" : compactorID
            }
        };
        return new Promise((resolve, reject)=>{
            docClient.get(params, (err, data)=>{
                if (err) {
                    reject("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    resolve(data)
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

    createAlarm(compactorID, alarmDetails){
        var docClient = this.docClient
        var { type, status, userid, address } = alarmDetails
        var params = {
            TableName: this.alarmInfoTable,
            Item:{
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

    updateAlarmInfo(compactorID, alarmDetails){
        var docClient = this.docClient
        var timestamp = Date.now()
        var { type , status } = alarmDetails
        var params = {
            TableName: this.alarmInfoTable,
            Item:{
                "compactorID" : compactorID,
                "timestamp" : timestamp,
                "humanReadableTS" : moment().format('LLLL'),
                "type" : type,
                "status" : status
            }
        };
        docClient.put(params, (err, data)=>{
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item:", JSON.stringify(data, null, 2));
            }
        });
    }

    raisedAlarm(compactorID,alarmDetails){

        let docClient = this.docClient
        if(compactorID){
            //if alarm is raised create record
            this.createAlarm(compactorID,alarmDetails)
            //find record in CompactorInfo table and update the alarm fields
            this.updateCompactorInfoAlarm(compactorID,alarmDetails)
            this.updateAlarmInfo(compactorID, alarmDetails)
        }else{
            return;
        }
    }
}

module.exports = Alarm