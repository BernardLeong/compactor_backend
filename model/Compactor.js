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

        this.livedocClient = new AWS.DynamoDB.DocumentClient(
            {
                region: 'ap-southeast-1',
                accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
                secretAccessKey: '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'
            }
        );
        this.addressTable = 'CompactorAddresses'
        this.compactTable = compactTable
        this.compactInfo = 'CompactorInfo'
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

    scanAllLiveCoordinates(){
        var dynamoClient = this.livedocClient
        var tableName = this.addressTable
        var params = {
            TableName: tableName, // give it your table name 
            Select: "ALL_ATTRIBUTES"
          };

          return new Promise((resolve, reject)=>{
            dynamoClient.scan(params, (err, data)=> {
                if (err) {
                    reject(err)
                 } else {
                    var dataItems = data.Items
                    resolve(dataItems)
                 }
            })
        });
    }

    scanAllLiveCompactor(){
        var dynamoClient = this.livedocClient
        var tableName = this.compactTable || this.compactInfo
        var params = {
            TableName: tableName, // give it your table name 
            Select: "ALL_ATTRIBUTES"
          };
        
          return new Promise((resolve, reject)=>{
              dynamoClient.scan(params, (err, data)=> {
                  if (err) {
                      reject(err)
                   } else {
                       var dataItems = data.Items

                       for(var i=0;i<dataItems.length;i++){
                            // dataItems[i]['WeightPercentage'] = dataItems[i].FilledLevel-Weight
                            dataItems[i]['sectionArea'] = 'A'
                       }
                      resolve(dataItems)
                   }
              })
          });
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

let compactor = new Compactor('Compactor_20201229')
var scanAllLiveCompactor = compactor.scanAllLiveCompactor()
// scanAllLiveCompactor.then((result)=>{
//     console.log(result)
// })

module.exports = Compactor