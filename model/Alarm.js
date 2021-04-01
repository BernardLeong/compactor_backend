const AWS = require("aws-sdk");
const moment = require('moment')
const env = require('dotenv').config()
const sortObjectsArray = require('sort-objects-array');

class Alarm{

    constructor(alarmTable){

        this.livedocClient = new AWS.DynamoDB.DocumentClient(
            {
                region: process.env.REGION,
                accessKeyId: process.env.ACCESSKEYID,
                secretAccessKey: process.env.SECRETACCESSKEY
            }
        ),
        this.dynamodb = new AWS.DynamoDB(
            {
                region: process.env.REGION,
                accessKeyId: process.env.ACCESSKEYID,
                secretAccessKey: process.env.SECRETACCESSKEY
            }
        ),
        this.compactInfoTable = 'CompactorInfo'
        this.alarmTable = alarmTable
        this.alarmInfoTable = 'AlarmInfo'
        this.lastID = 'lastID'
    }

    async readAllTables(exclusiveStartTableName=false){
        let dynamo = this.dynamodb
        if(exclusiveStartTableName){
            let params = {
                "ExclusiveStartTableName" : exclusiveStartTableName
            }

            return new Promise((resolve, reject) => {
                dynamo.listTables(params , (err, data) => {
                    if(err) reject(err);
                    else resolve(data);
                })
            })
        }else{
            return new Promise((resolve, reject) => {
                dynamo.listTables({} , (err, data) => {
                    if(err) reject(err);
                    else resolve(data);
                })
            })
        }
    }



    async listtables(includes=false){
        let tableNames = [];
        let hasNext = true;
        let ExclusiveStartTableName = undefined;

        let dynamo = this.dynamodb

        while (hasNext) {
            let response = await dynamo
                .listTables({ ExclusiveStartTableName })
                .promise();

            // Add tableNames returned in this paged response. 
            tableNames.push(...response.TableNames);

            ExclusiveStartTableName = response.LastEvaluatedTableName;
            hasNext = !!ExclusiveStartTableName;
        }

        if(includes){
            tableNames = tableNames.map((table)=>{
                if(table.includes(includes)){
                    return table
                }
            })
        }
        tableNames = tableNames.filter(Boolean)
        return tableNames
    }

    async getAlarmReportData(){
        var dateRange = this.listtables('Alarm_2021')
        
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
}

let alarm = new Alarm
alarm.listtables('Compactor_2021')

module.exports = Alarm