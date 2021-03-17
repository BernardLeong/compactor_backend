const AWS = require("aws-sdk");
const moment = require('moment')
const env = require('dotenv').config()
const sortObjectsArray = require('sort-objects-array');

class Alarm{

    constructor(alarmTable){

        this.liveDynamo = new AWS.DynamoDB(
            {
                region: 'ap-southeast-1',
                accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
                secretAccessKey: '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'
            }
        );

        this.docClient = new AWS.DynamoDB.DocumentClient(
            {
                region: process.env.REGION,
                accessKeyId: process.env.ACCESSKEYID,
                secretAccessKey: process.env.SECRETACCESSKEY
            }
        );

        this.livedocClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'ap-southeast-1',
                accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
                secretAccessKey: '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'
            }
        );
        this.compactInfoTable = 'CompactorInfo'
        this.alarmTable = alarmTable
        this.alarmInfoTable = 'AlarmInfo'
        this.lastID = 'lastID'
    }

    async getAlarmReportData(){
        var tablesAll = await this.readAllTables()
        tablesAll = tablesAll.TableNames
        var dateRange = []
        for(var i=0;i<tablesAll.length;i++){
            if(tablesAll[i].includes('Alarm_2')){
                dateRange.push(tablesAll[i])
            }
        }
        var alarmdata = []
        //get all the data from the date range
        for(var i=0;i<dateRange.length;i++){
            var tableName = dateRange[i]
            var alarm = new Alarm(tableName)
            var alarmData = await alarm.getAllLiveAlarm()
            alarmdata.push(alarmData.Items)
        }

        alarmdata = alarmdata.flat()
        var alarmdataCopy = []
        for(var i=0;i<alarmdata.length;i++){
            if(typeof alarmdata[i] !== 'undefined' && alarmdata[i].Status == 'Cleared' && alarmdata[i].ClearedTS){
                alarmdataCopy.push(alarmdata[i])
            }
        }

        alarmdata = alarmdataCopy
        alarmdataCopy = []
        for(var i=0;i<alarmdata.length;i++){
            var alarmItem = alarmdata[i]
            var earlier = new Date(alarmItem.ts)
            var later = new Date(alarmItem.ClearedTS)
            var time_difference = this.time_difference(later, earlier)

            var hours = Math.floor(time_difference/60)
            var days = Math.floor(hours/24)
            var minutes = time_difference
            
            if(hours < 1){
                hours = 0
            }
            
            if(days < 1){
                days = 0
            }
            
            if(days){
                hours = hours - (days * 24)

                if(hours == 1){
                    time_difference = `${days} day ${hours} hour`
                }else{
                    time_difference = `${days} days ${hours} hours`
                }
            }else if(!days && hours){
                minutes = minutes - (hours *60)
                if(hours == 1){
                    if(minutes == 1){
                        time_difference = `${hours} hour ${minutes} minute`
                    }else{
                        time_difference = `${hours} hour ${minutes} minutes`
                    }
                }else{
                    if(minutes == 1){
                        time_difference = `${hours} hours ${minutes} minute`
                    }else{
                        time_difference = `${hours} hours ${minutes} minutes`
                    }
                }
            }else{
                if(minutes < 1){
                    time_difference = `Less than a minute`
                }else if(minutes == 1){
                    time_difference = `${minutes} minute`
                }else{
                    time_difference = `${minutes} minutes`
                }
            }
            alarmdata[i]['EquipmentID'] = alarmdata[i]['ID']
            alarmdata[i]['EquipmentType'] = alarmdata[i]['Type']
            alarmdata[i]['timeDifference'] = time_difference

            delete(alarmdata[i]['ID'])
            delete(alarmdata[i]['EquipmentType'])
        }
        //add in time difference
    //markReport                
        alarmdata = sortObjectsArray(alarmdata, 'ts')
        return alarmdata
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

        var tableName = this.alarmTable || this.alarmInfoTable
        var params = {
            TableName: tableName,
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

    async clearMailAlarm(timestamp, compactorID){
        var docClient = this.livedocClient
        var table = 'AlarmToBeMailed'
        var params = {
            TableName:table,
            Key:{
                "ts": timestamp,
                "ID" : compactorID
            },
            UpdateExpression: "set SendMail = :sendmail",
            ExpressionAttributeValues:{
                ":sendmail":'true',
            },
            ReturnValues:"UPDATED_NEW"
        };
        docClient.update(params, (err, data) => {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
        });
    }

    time_difference(later, earlier) 
    {
        var diff =(later.getTime() - earlier.getTime()) / 1000;
        diff /= 60;
        return Math.abs(Math.round(diff));
    }

    async readAllTables(){
        let dynamo = this.liveDynamo
        return new Promise((resolve, reject) => {
            dynamo.listTables({} , (err, data) => {
                if(err) reject(err);
                else resolve(data);
            })
        })
    }

    async getAllClearedAlarm(){
        var tableName = this.alarmTable
        var dynamoClient = this.livedocClient
        var params = {
          TableName: tableName, // give it your table name 
          Select: "ALL_ATTRIBUTES"
        };
      
        return new Promise((resolve, reject)=>{
            dynamoClient.scan(params, (err, data)=> {
                if (err) {
                    resolve(err)
                 } else {
                    var dataSets = []
                    data = data.Items
                    for(var i=0;i<data.length;i++){
                        var dta = data[i]
                        if(dta.ClearedTS && dta.Status == 'Cleared'){
                            dataSets.push(data[i])
                        }
                    }
                    data = dataSets
                    resolve(data)
                 }
            })
        });
    }

    async getAllLiveAlarm(){
        var tableName = this.alarmTable
        var dynamoClient = this.livedocClient
        var params = {
          TableName: tableName, // give it your table name 
          Select: "ALL_ATTRIBUTES"
        };
      
        return new Promise((resolve, reject)=>{
            dynamoClient.scan(params, (err, data)=> {
                if (err) {
                    resolve(err)
                 } else {
                    resolve(data)
                 }
            })
        });
    }

    getAllAlarm(){
        console.log(tableName)
        var tableName = this.alarmTable || this.alarmInfoTable 
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
        var { type, alarmStatus, userid, address } = alarmDetails
        var { prefix, lastid } = await this.getPrefixedAlarmID()

        var tableName = this.alarmTable || this.alarmInfoTable
        var params = {
            TableName: tableName,
            Item:{
                "alarmID" : prefix,
                "compactorID": compactorID,
                "timeStamp" : Date.now(),
                "alarmStatus" : alarmStatus,
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

    getAlarmDescription(alarmID){
        var docClient = this.docClient
        var tableName = this.alarmInfoTable
        var params = {
            TableName: tableName,
            Key:{
                "alarmID": alarmID
            }
        };
        
        return new Promise((resolve, reject)=>{
            docClient.get(params, (err, data)=>{
                if (err) {
                    reject(err);
                } else {
                    resolve(data.Item.description);
                }
            });
        })
        
    }
}

module.exports = Alarm