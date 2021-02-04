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
        this.equipmentInformation = 'EquipmentInformation'
    }

    async scanAllLiveCoordinates(){
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
                            dataItems[i]['sectionArea'] = 'CBM'
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

    async scanEquipmentCurrentStatus(){
        var tableName = this.equipmentInformation

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