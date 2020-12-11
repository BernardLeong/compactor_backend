const AWS = require("aws-sdk");
const moment = require('moment')
const Alarm = require('./Alarm')

class Compactor{
    //if compactor is on, a ping is sent(from what i understand), so create record in dynamoDB
    constructor(compactTable){
        this.docClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'us-east-2',
                accessKeyId: 'AKIA47VGGTAQQJKET2X7',
                secretAccessKey: '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'
            }
        );
        this.compactTable = compactTable
        this.compactInfo = 'CompactorInfo'
    }

    offEngine(compactorID){
        let alarm = new Alarm
        let getAlarm = alarm.getAlarm(compactorID)
        var docClient = this.docClient
        return new Promise((resolve, reject)=>{
            getAlarm.then((result)=>{
                if(Object.keys(result).length != 0){
                    //if not empty
                    //change status to off
                    var alarmStatus = 'off'
                    var tableName = 'Alarm_202010'
                    var params = {
                        TableName:tableName,
                        Key:{
                            "compactorID": compactorID
                        },
                        UpdateExpression: "set alarmStatus = :alarmStatus",
                        ExpressionAttributeValues:{
                            ":alarmStatus":alarmStatus,
                        },
                        ReturnValues:"UPDATED_NEW"
                    };
                    docClient.update(params, (err, data)=>{
                        if (err) {
                            reject(err)
                        } else {
                            resolve(data)
                        }
                    });
                }
            })
        })
    }

    editCompactor(compactorID, compactorDetails){
        var tableName = this.compactInfo
        var docClient = this.docClient
        var { address, compactorType, sectionArea } = compactorDetails
        var params = {
            TableName:tableName,
            Key:{
                "compactorID": compactorID
            },
            UpdateExpression: "set address = :compactorAddress, compactorType=:compactorType, sectionArea=:compactorSection",
            ExpressionAttributeValues:{
                ":compactorAddress":address,
                ":compactorType":compactorType,
                ":compactorSection":sectionArea
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

    clearAlarmRaised(compactorID){
        var docClient = this.docClient
        var params = {
            TableName: this.compactInfo,
            Key:{
                "compactorID" : compactorID
            },
            UpdateExpression: "set alarmRaised = :alarmRaised",
            ExpressionAttributeValues:{
                ":alarmRaised": false
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
    
    addMachine(compactorID, compactorDetails){
        var tableName = this.compactInfo
        var docClient = this.docClient
        var { address, coordinate, type, weight} = compactorDetails
        var params = {
            TableName:tableName,
            Item:{
                "compactorID": compactorID,
                "address" : address,
                "coordinate" : coordinate,
                "compactorType" : type,
                "weight" : weight
            }
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

    scanAllCompactor(){
        var tableName = this.compactTable || this.compactInfo

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

    onMachineOn(compactorID){
        //machine on ping is received, save record into compactor_YYMMDD
        var docClient = this.docClient
        var timestamp = Date.now()
        var params = {
            TableName:this.compactTable,
            Item:{
                "compactorID": compactorID,
                "timeStamp" : timestamp,
                "humanReadableTS" : moment().format('LLLL')
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

    getCompactorInfo(compactorID){
        var docClient = this.docClient
        var params = {
            TableName: this.compactInfo,
            Key:{
                "compactorID" : compactorID
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
}

module.exports = Compactor