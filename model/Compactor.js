const AWS = require("aws-sdk");
const moment = require('moment')
const Alarm = require('./Alarm')
const sortObjectsArray = require('sort-objects-array');

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

        this.liveDyDb = new AWS.DynamoDB(
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

    async getEquipmentWeightCollection(){
        //markrrrr
        var dynamoClient = this.livedocClient
        var tableName = "EquipmentWeightCollection"
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

    async getEquipmentEvents(ID, tableName){
            var params = {
                TableName: tableName, // give it your table name 
                Select: "ALL_ATTRIBUTES"
            };
        
            var liveDynamo = this.liveDyDb
            return new Promise((resolve, reject)=>{
                liveDynamo.scan(params, (err, data)=>{
                    if (err) {
                        resolve("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        var dataItems = data.Items
                        var equipmentID = ID
                        var resolveData = []
                        //get the weight event based on equipmentID
                        for(var index=0;index<dataItems.length;index++){
                            var dataItem = dataItems[index]
                            var eqID = dataItem.ID
                            eqID = eqID['S']
        
                            if(eqID == equipmentID){
                                var obj = {}
                                obj["ts"] = dataItem['ts']['S']
                                obj["EquipmentType"] = dataItem['EquipmentType']['S']
                                obj["ID"] = dataItem['ID']['S']
                                obj["Weight"] = dataItem['ts']['S']
                                obj["Weight"] = dataItem['Weight']['N']
                                obj["FilledLevel-Weight"] = dataItem['FilledLevel-Weight']['N']
                                resolveData.push(obj)
                            }
                            resolve(resolveData)
                        }
                    }
                })
            })
    }

    async getPreviousBlockData(liveDynamo, equipmentID){
        var tableName = "EquipmentWeightCollection"
        var params = {
            TableName: tableName, // give it your table name 
            Select: "ALL_ATTRIBUTES"
        };
    
        return new Promise((resolve, reject)=>{
            liveDynamo.scan(params, (err, data)=>{
                if (err) {
                    resolve("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    var dataItems = data.Items
                    var resolveData = []
    
                    for(var index=0;index<dataItems.length;index++){
                        var obj = {}
                        var dataItem = dataItems[index]
                        dataItem['latestTS'] ? obj["latestTS"] = dataItem['latestTS']['S'] : obj["latestTS"] = false
                        obj["recordTS"] = dataItem['recordTS']['S']
                        obj["EquipmentID"] = dataItem['EquipmentID']['S']
                        obj["collectedWeight-ts"] = dataItem['collectedWeight-ts']['S']
                        obj["Weight-Collected"] = dataItem['Weight-Collected']['N']
                        dataItem['currentWeight'] ? obj["currentWeight"] = dataItem['currentWeight']['N'] : obj["currentWeight"] = 0
                        if(obj.EquipmentID == equipmentID){
                            resolveData.push(obj)
                        }
                    }
                    resolveData = sortObjectsArray(resolveData, 'recordTS')
                    resolve(resolveData)
                }
            })
        })
    }

    async buildParamsObj(equipmentID,tableName){
       
        var weightEvents = await this.getEquipmentEvents(equipmentID,tableName)
        if(weightEvents.length <= 0){
            return
        }

        var liveDynamo = this.liveDyDb
        weightEvents = sortObjectsArray(weightEvents, 'ts')
    
        var lastIndex = weightEvents.length -1
        var latestRecord = weightEvents[lastIndex]
        //get the previouslatestTS before is being updated
    
        var weightEventsCopy = []
        var currentWeight = false
        var blockData = await this.getPreviousBlockData(liveDynamo,equipmentID)
    
        var lastIndex = blockData.length -1
        var latestTSCopy = blockData[lastIndex] 
        if(blockData.length <= 0){
            var latestTS = false
        }else{
            var latestTS = latestTSCopy.latestTS
        }
    
    //     //if for the pass hour no new events
        var maximum = weightEvents.reduce((res, obj)=>{
            return (parseFloat(obj["Weight"]) < parseFloat(res["Weight"])) ? res : obj;
        });
        var maximumWeight = parseFloat(maximum['Weight']) 
        
    
        var currentWeight = weightEvents
        currentWeight = weightEvents[currentWeight.length -1]
        currentWeight = currentWeight.Weight
    
        if(currentWeight < 0){
            currentWeight = 0
        }
        //check if there is a cuurent weight in db
        for(var i=0;i<weightEvents.length;i++){
            var weightEvent = weightEvents[i]
            
            if(latestTS < weightEvent.ts){
                weightEventsCopy.push(weightEvents[i])
            }
        }
        if(weightEventsCopy.length <= 0){ 
            if(blockData.length <= 0){
                var maximumWeight = currentWeight
                var minimum = weightEvents.reduce((res, obj)=>{
                    return (parseFloat(obj["Weight"]) < parseFloat(res["Weight"])) ? obj : res;
                });
                var minimumWeight = parseFloat(minimum['Weight'])
    
                var maximum = weightEvents.reduce((res, obj)=>{
                    return (parseFloat(obj["Weight"]) < parseFloat(res["Weight"])) ? res : obj;
                });
                var maximumWeight = parseFloat(maximum['Weight'])
            }else{
                var maximumWeight = currentWeight
                var minimumWeight = currentWeight
            }
        }else{
            var maximum = weightEventsCopy.reduce((res, obj)=>{
                return (parseFloat(obj["Weight"]) < parseFloat(res["Weight"])) ? res : obj;
            });
    
            var maximumWeight = parseFloat(maximum['Weight']) 
            if(currentWeight && maximumWeight < currentWeight){
                maximumWeight = currentWeight
            }
    
            var minimum = weightEventsCopy.reduce((res, obj)=>{
                return (parseFloat(obj["Weight"]) < parseFloat(res["Weight"])) ? obj : res;
            });
            var minimumWeight = parseFloat(minimum['Weight'])
        }
        currentWeight = parseFloat(currentWeight)
        if(minimumWeight < 0){
            var weightDifference = maximumWeight
        }else{
            var weightDifference = Math.round(maximumWeight - minimumWeight)    
        }
    
        if(typeof(minimum) == "undefined"){
            var minimum = {}
            minimum['ID'] = equipmentID
            minimum["Weight"] = currentWeight
            minimum['ts'] = latestTS
        }
    
        if(minimum){
            minimum["Weight"] = parseFloat(minimum["Weight"])
        }
        var params = {}

        if(weightDifference > 50 && minimum.ts > maximum.ts){
            params['EquipmentID'] = { "S" : minimum['ID']}
            params['collectedWeight-ts'] = { "S" : minimum['ts'] }
            params['recordTS'] = { "S" : moment().format() };
            params['insertID'] = { "S" : `ID-${parseInt(Math.random()*100)}-${minimum['ID']}` };
            params['currentWeight'] = { "S" : currentWeight.toString() };
            params['Weight-Collected'] = { "S" : weightDifference.toString() }
            params['latestTS'] = { "S" : latestRecord.ts}
        }
        
        if(Object.keys(params).length !== 0 ){
            var putReq = {
                PutRequest: {
                    Item: params
                }
            }
            return putReq
        }else{
            return false
        }
        
        //latestTS will be the latest event TS looked thru based on EquipmentID
    
        // if(weightDifference > 50){
        //     if(minimum.ts > maximum.ts){
        //         //save record into weightcollected information here
        //         params['Weight-Collected'] = { "S" : weightDifference.toString() }
        //         // saveRecordToEquipmentWeightCollection(liveDynamo,params)
        //     }
        // }

        // return putReq
    }

    async saveWeightCollected(){
        // var equipmentIDs = await EquipmentIDs(liveDynamo)
        var equipmentIDs = [
            'DS-809','DS-810','DS-811','DS-812','DS-813','DS-814','DS-815','DS-816','DS-817','DS-818',
            'DS-819','DS-820','DS-821','DS-822','DS-823','MM10-804','MM10-805','MM10-806','MM10-807','MM10-808',
            'MM8-800','MM8-801','MM8-802','MM8-803'
        ]
    
        //after looking thru the equipment IDS
        let params = []

        let dateObj = moment().format('L');
        var yymmdd = dateObj.split('/')
        yymmdd = `${yymmdd[2]}${yymmdd[0]}${yymmdd[1]}`
        var tableName = `Compactor_${yymmdd}`
        var dynamodb = this.liveDyDb
        var response = await dynamodb.listTables(params).promise();
        response = response.TableNames
        var tableArr = []
        for(var i=0;i<response.length;i++){
            var resp = response[i]
            if(resp == tableName){
                tableArr.push(response[i])
            }
        }

        if(tableArr.length > 0){
            for(var index=0;index<equipmentIDs.length;index++){
                var equipmentID = equipmentIDs[index]
                var weightEvents = await this.getEquipmentEvents(equipmentID,tableName)
        
                if(weightEvents.length <= 0){
                    continue;
                }
                //update record of weight events 
                let parmasHeader = await this.buildParamsObj(equipmentID,tableName)
                params.push(parmasHeader)
            }
    
            params = params.filter(Boolean);
                var insertParams = {
                    RequestItems: {
                        "EquipmentWeightCollection": params
                    }
                }
        
                var dynamoDB = new AWS.DynamoDB(
                    {
                        region: 'ap-southeast-1',
                        accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
                        secretAccessKey: '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'
                    }
                );
                if(params.length <= 0){
                    return new Promise((resolve, reject)=>{
                        resolve({success: false, message: 'Nothing to insert, no new events'})
                    })
                }else{
                    return new Promise((resolve, reject)=>{
                        dynamoDB.batchWriteItem(insertParams, function(err, data) {
                            if (err) {
                                resolve({
                                    success: false,
                                    message: err.message
                                });
                            } else {
                                resolve({
                                    success: true
                                });
                            }
                        });
                    })
                }
        }else{
            return new Promise((resolve, reject)=>{
               resolve({
                    success: false,
                    message: "Table not generated yet"
                })
            })
        }
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
        
    removeDuplicates(arr, key) {
        return [...new Map(arr.map(item => [item[key], item])).values()]
    }


    async getWeightReport(){
        
    }
    async scanEquipmentCurrentStatus(){
        //marking
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

module.exports = Compactor