const moment = require('moment')
const AWS = require('aws-sdk')
const fs = require('fs')
const util = require('util')
const CryptoJS = require("crypto-js");
const awsIot = require('aws-iot-device-sdk');
const sortObjectsArray = require('sort-objects-array');
const writeFile = util.promisify(fs.writeFile)
const Alarm = require('./../model/Alarm')
const Excel = require('./../model/Excel')
const Compactor = require('./../model/Compactor')
const User = require('./../model/User')
const Authetication = require('./../model/Authetication')

const s3 = new AWS.S3({
    accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
    secretAccessKey: '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'
})

const Default = (app) => {
    app.get('/',async(req, res)=>{
        res.json(
            {
                'message' : 'Welcome to iZeem Backend API'
            }
        )
    })
}

const Download = (app) => {
    app.get('/generatexlxs/alarmreport/:data',async(req, res)=>{
        var encrypt = req.params.data
        var encrypytkey = 'somekey'
        var bytes  = CryptoJS.AES.decrypt(encrypt, encrypytkey);
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        var isSelectedID = false
        var isDaterange = false
        var selectedArr = []

        var tempArr = []
        var tempArray = []
        var alarm = new Alarm
        var alarmReport = await alarm.getAlarmReportData()
        if(decryptedData.selectedID){
            isSelectedID = true
            selectedArr = decryptedData.selectedID
        }

        if(decryptedData.dateRange){
            isDaterange = true
        }

        if(isSelectedID){
            for(var i=0;i<selectedArr.length;i++){
                var id = selectedArr[i]
                for(var index=0;index<alarmReport.length;index++){
                    var alarm = alarmReport[index]
                    if(alarm.EquipmentID == id){
                        tempArr.push(alarmReport[index])
                    }
                }
            }
            tempArr = sortObjectsArray(tempArr, 'ts', {order: 'desc'})
            alarmReport = tempArr
        }

        if(isDaterange){
            var dateRangeObject = decryptedData.dateRange
            var startDate = dateRangeObject.starttime
            var endDate = dateRangeObject.endtime

            for(var i=0;i<alarmReport.length;i++){
                var data = alarmReport[i]
                if(startDate !== '' || endDate !== ''){
                    if(startDate <= endDate){
                        if(data.ts >= startDate && data.ts <= endDate){
                            tempArray.push(alarmReport[i])
                        }
                    }
                }
            }
            alarmReport = tempArray
        }

        if(isDaterange && isSelectedID){
            var tempArray = []
            var tempArr = []
            var dateRangeObject = decryptedData.dateRange
            var startDate = dateRangeObject.starttime
            var endDate = dateRangeObject.endtime

            for(var i=0;i<selectedArr.length;i++){
                var id = selectedArr[i]
                for(var index=0;index<alarmReport.length;index++){
                    var alarm = alarmReport[index]
                    if(alarm.EquipmentID == id){
                        tempArr.push(alarmReport[index])
                    }
                }
            }

            for(var i=0;i<tempArr.length;i++){
                var data = tempArr[i]
                if(startDate !== '' || endDate !== ''){
                    if(startDate <= endDate){
                        if(data.ts >= startDate && data.ts <= endDate){
                            tempArray.push(tempArr[i])
                        }
                    }
                }
            }

            if(tempArray > 0){
                tempArray = sortObjectsArray(tempArray, 'ts', {order: 'desc'})
            }
            alarmReport = tempArray
        }

        alarmReport = sortObjectsArray(alarmReport, 'ts', {order: 'desc'})
        var exportObj = new Excel
        const workSheetColumnNames = [
            "Alarm Clear Timestamp",
            "Alarm Trigger Timestamp",
            "Alarm Status",
            "Alarm Type",
            'Equipment ID',
            "Duration for Alarm Deactivation"
        ]
        var workSheetName = 'alarmExcel'
        var date = moment().format('L');
        var yymmdd = date.split('/')
        yymmdd = `${yymmdd[2]}${yymmdd[0]}${yymmdd[1]}`
        
        var filePath = `./alarmReport_${yymmdd}.xlsx`
        exportObj.exportDataToExcel(alarmReport, workSheetColumnNames, workSheetName, filePath)

        var file = `${__dirname}/../${filePath}`;
        res.download(file);
    })
}

const Login = (app) => {

    app.post('/edituser',async(req, res)=>{
        let auth = new Authetication
        let user = new User
        
        let apikey = await auth.getAPIKeys(req.headers.apikey)
        let type = apikey[0]
        type = type.type

        if(apikey.length <= 0){
            res.json({
                'success' : false,
                'error' : 'API Keys Incorrect'
            })
            return;
        }

        var accesstoken = null

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }

        if(accesstoken){
            var checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                if(type == "adminUser"){
                    //edit a user 
                    //get current udetails 

                    let userid = req.body.userid
                    let currentUDetails = await user.getUserDetails(userid)
                    currentUDetails = currentUDetails.Item
                    console.log(currentUDetails)

                    let username = req.body.username || currentUDetails.username
                    let password = req.body.password
                    let userType = req.body.userType || currentUDetails.userType

                    let uDetail = {
                        username : username,
                        password : password,
                        userType : userType
                    }

                    console.log(uDetail)
                        //edit user and password
                    let editUser = await user.editUser(userid, uDetail)
                    res.json({
                        'success' : true,
                    })
                }else{
                    res.json(
                        {
                            'success' : false,
                            'message' : "Not enough access rights"
                        }
                    )
                }
            }
        }else{
            res.json(
                {
                    'success' : false,
                    'message' : 'Please log in first'
                }
            )
        }
    })

    app.post('/deleteUser',async(req, res)=>{
        let auth = new Authetication
        let user = new User
        
        let apikey = await auth.getAPIKeys(req.headers.apikey)
        
        if(apikey.length <= 0){
            res.json({
                'success' : false,
                'error' : 'API Keys Incorrect'
            })
            return;
        }
        let type = apikey[0]
        type = type.type
        
        var accesstoken = null

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }

        if(accesstoken){
            var checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                if(type == "adminUser"){
                    if(req.body.userid){
                        //save username and password
                        var userid = req.body.userid

                        let deleteUser = await user.deleteUser(userid)
                        res.json(
                            {
                                'success' : true,
                                'message' : "User deleted"
                            }
                        )
                    }
                }else{
                    res.json(
                        {
                            'success' : false,
                            'message' : "Not enough access rights"
                        }
                    )
                }
            }
        }else{
            res.json(
                {
                    'success' : false,
                    'message' : 'Please log in first'
                }
            )
        }
    })

    app.post('/addUser',async(req, res)=>{
        let auth = new Authetication
        let user = new User
        
        let apikey = await auth.getAPIKeys(req.headers.apikey)
        
        if(apikey.length <= 0){
            res.json({
                'success' : false,
                'error' : 'API Keys Incorrect'
            })
            return;
        }
        let type = apikey[0]
        type = type.type
        
        var accesstoken = null

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }

        if(accesstoken){
            var checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                if(type == "adminUser"){
                    if(req.body.username && req.body.password){
                        //save username and password
                        var username = req.body.username
                        var password = req.body.password
                        var usertype = req.body.type
            
                        let user = new User
                        let saveNewUser = user.saveNewUser(username, password, usertype)
                        saveNewUser.then((result)=>{
                            if(!result){
                                res.json({
                                    'success' : result,
                                    "error" : 'Username already exists'
                                })
                            }else{
                                res.json({
                                    'success' : true
                                })
                            }
                        })
                    }
                }else{
                    res.json(
                        {
                            'success' : false,
                            'message' : "Not enough access rights"
                        }
                    )
                }
            }
        }else{
            res.json(
                {
                    'success' : false,
                    'message' : 'Please log in first'
                }
            )
        }
    })

    app.get('/listOfUsers',async(req, res)=>{
        let auth = new Authetication
        let user = new User
        
        let apikey = await auth.getAPIKeys(req.headers.apikey)
        let type = apikey[0]
        type = type.type

        if(apikey.length <= 0){
            res.json({
                'success' : false,
                'error' : 'API Keys Incorrect'
            })
            return;
        }

        var accesstoken = null

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }

        if(accesstoken){
            var checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                if(type == "adminUser"){
                    let getListofUsers = await user.getListofUsers()
                    getListofUsers = getListofUsers.map((user)=>{
                        delete(user['password'])
                        return user
                    })
                    res.json(
                        {
                            'success' : true,
                            'userLists' : getListofUsers
                        }
                    )
                }else{
                    res.json(
                        {
                            'success' : true,
                            'userLists' : [],
                            'message' : "Not enough access rights"
                        }
                    )
                }
            }
        }else{
            res.json(
                {
                    'success' : false,
                    'message' : 'Please log in first'
                }
            )
        }
    })

    app.get('/getCurrentUser',async(req, res)=>{
        let auth = new Authetication

        var accesstoken = null

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }

        if(accesstoken){
            var checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                let getUserNameFromToken = auth.getUserNameFromToken(accesstoken)
                getUserNameFromToken.then((uDetails)=>{
                    res.json({
                        'success' : true,
                        'username' : uDetails.username,
                        'userid' : uDetails.userid
                    })
                })
            }
        }else{
            res.json(
                {
                    'success' : false,
                    'message' : 'Please log in first'
                }
            )
        }
    })

    app.post('/registerUser',(req, res)=>{
        if(req.body.username && req.body.password){
            //save username and password
            var username = req.body.username
            var password = req.body.password
            var type = req.body.type || 'user'

            let user = new User
            let saveNewUser = user.saveNewUser(username, password, type)
            saveNewUser.then((result)=>{
                if(!result){
                    res.json({
                        'success' : result,
                        "error" : 'Username already exists'
                    })
                }else{
                    res.json({
                        'success' : true
                    })
                }
            })
        }
    })

    app.post('/loginUser',(req, res)=>{
        if(req.body.username && req.body.password){
            let auth = new Authetication
            let username = req.body.username
            let password = req.body.password
            auth.autheticate(username, password).then((result)=>{
                console.log(result)
                res.json(result)
            }).catch((err)=>{
                console.log(err)
                res.json(err)
            })
        }else{
            res.json({
                'success' : false
            })
        }
    })

    app.post('/logout',(req, res)=>{
        if(req.body.token){

            let token = req.body.token
            //search token whether is a valid token
            let auth = new Authetication
            auth.checkToken(token).then((count)=>{
                if(count >= 1){
                    //invalid token
                    auth.invalidateToken(token)
                    res.json({
                        'success' : true,
                        'message' : 'User sucessfully logged out'
                    })
                }
            }).catch((err=>{
                res.json({
                    'success' : false,
                    'error' : err
                })
            }))
        }
    })
}

const AlarmRoutes = (app) =>{

    app.get('/getBarData/:month',async(req, res)=>{

        //get bar data for alarm tiggered for the month
        //get all the alarm events for all time
        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }
        
        if(accesstoken){
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                var alarm = new Alarm
                var tablesAll = await alarm.readAllTables()
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
                if(req.params.month == 'today'){
                    //markkk
                    //date example 2021-01-07 14:17:28
                    
                    //filter the alarmData to today
                    alarmdata = alarmdata.map((alarm)=>{
                        var date = moment().format('L');
                        var yymmdd = date.split('/')
                        var startTime = `${yymmdd[2]}-${yymmdd[0]}-${yymmdd[1]} 00:00:00`
                        var endTime = `${yymmdd[2]}-${yymmdd[0]}-${yymmdd[1]} 23:59:59`
                        if(startTime <= alarm.ts && endTime >= alarm.ts){
                            return alarm
                        }
                    })

                    alarmdata = alarmdata.filter(Boolean)

                    var severeAlarm = ['FireAlarm', 'DischargeGateMotorTrip', 'DischargeScrewMotorTrip']

                    alarmdata = severeAlarm.map((sAl)=>{
                        var alarmData = alarmdata.map((alarm)=>{
                            if(alarm.Type == sAl){
                                return alarm
                            }
                        })

                        return alarmData
                    })
                    alarmdata = alarmdata.flat()
                }
                
                alarmdata = alarmdata.filter(Boolean)

                var dataObj = {}
                dataObj['success'] = true

                for(var i=0;i<severeAlarm.length;i++){
                    var sAl = severeAlarm[i]
                    var tempArr = []
                    dataObj[sAl] = 0
                }

                for(var i=0;i<severeAlarm.length;i++){
                    var sAl = severeAlarm[i]
                    var tempArr = []
                    for(var x=0;x<alarmdata.length;x++){
                        var alarm = alarmdata[x]
                        // obj[sAl] = 0
                        if(alarm.Type == sAl){
                            tempArr.push(alarm)
                            dataObj[sAl] = tempArr.length
                        }
                    }
                }

                res.json(
                    dataObj
                )
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })

    app.get('/getAlarmReport/all',async(req, res)=>{
        let auth = new Authetication
        let apikey = await auth.getAPIKeys(req.headers.apikey)

        if(apikey.length <= 0){
            res.json({
                'success' : false,
                'error' : 'API Keys Incorrect'
            })
            return;
        }

        var accesstoken = null
        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }
        if(accesstoken){
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                //content in here
                //decrypt time
                var alarm = new Alarm
                var tablesAll = await alarm.readAllTables()
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

                alarmdata = alarmdata.concat(...alarmdata)
                console.log(alarmdata)
                var alarmdataCopy = []
                for(var i=0;i<alarmdata.length;i++){
                    if(typeof alarmdata[i] !== 'undefined' && alarmdata[i].Status == 'Cleared' && alarmdata[i].ClearedTS){
                        alarmdataCopy.push(alarmdata[i])
                    }
                }

                alarmdata = alarmdataCopy
                alarmdataCopy = []
                for(var i=0;i<alarmdata.length;i++){
                    var alarmObj = new Alarm
                    var alarmItem = alarmdata[i]
                    var earlier = new Date(alarmItem.ts)
                    var later = new Date(alarmItem.ClearedTS)
                    var time_difference = alarmObj.time_difference(later, earlier)

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
                res.json({'data' : alarmdata})
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })

    app.post('/publishMQTT',async(req, res)=>{
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        
        var accesstoken = null
        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }
        if(accesstoken){

            if(type !== 'admin'){
                res.json({
                    'error' : `task not allowed to be executed by ${type}`
                })
                return;
            }

            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken, type)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                var device = awsIot.device({
                    keyPath: './keys/053e36fae2-private.pem.key',
                    certPath: './keys/053e36fae2-certificate.pem.crt',
                    caPath: './keys/root-CA.crt',
                    clientId: 'iotconsole-161298119170-0',
                    host: 'ak2ka7wr2oexq-ats.iot.ap-southeast-1.amazonaws.com'
                });
        
                // example eventParams = { 
                //     "ID" : "DS-815", 
                //     "ts": "2021-02-08 17:43:44", 
                //     "Command" : "Clear", 
                //     "Type" : "EStop", 
                //     "User" : "Test User" 
                // }
        
                eventParams = { 
                    "ID" : req.body.ID, 
                    "ts": req.body.ts, 
                    "Command" : "Clear", 
                    "Type" : req.body.type, 
                    "User" : req.body.username
                }
        
                device
                .on('connect', function() {
                    console.log('connect');
                    // device.subscribe('Compactor/Data')
                    // device.publish('Compactor/Data', JSON.stringify(eventParams))
                    // device.subscribe('Compactor/Lol');
                    device.subscribe('Compactor/Command')
                    device.publish('Compactor/Command', JSON.stringify(eventParams));
                    res.json({
                        success : true
                    })
                });
        
                device
                .on('message', function(topic, payload) {
                    console.log('message', topic, payload.toString());
                });
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })

    app.post('/sendmail',async(req, res)=>{
        const mailgun = require("mailgun-js");
        const DOMAIN = process.env.MAILGUN_DOMAIN;
        const api_key = process.env.MAILGUN_API_KEY
        const mg = mailgun({apiKey: api_key, domain: DOMAIN});
        var compactor = new Compactor
        var allCompactorAddresses = await compactor.scanAllLiveCoordinates()
        var address = ''
        for(var i=0;i<allCompactorAddresses.length;i++){
            if(req.body.ID == allCompactorAddresses[i].EquipmentID){
                address = allCompactorAddresses[i].address
            }
        }
        var Etype = 'Minimatic'
        if(req.body.EquipmentType == 'DS'){
            var Etype = 'DustScrew'
        }
        var template = ''
        if(req.body.Status == 'Cleared'){
            template = `
            <div>Dear Sir/Mdm,</div>
            <div>&nbsp;</div>
            <div>Please be informed that ${Etype} Alarm had been Cleared</div>
            <div>&nbsp;</div>
            <div>Details are below</div>
            <div>&nbsp;</div>
            <div>ID : ${req.body.ID},</div>
            <div>ts: ${req.body.ts},</div>
            <div>EquipmentType: ${req.body.EquipmentType},</div>
            <div>Type: ${req.body.Type},</div>
            <div>Status: ${req.body.Status}</div>
            <div>Location: ${address}</div>            
            `
        }else{
            var template = `
            <div>Dear Sir/Mdm,</div>
            <div>&nbsp;</div>
            <div>Please be informed that ${Etype} Alarm had been Raised</div>
            <div>&nbsp;</div>
            <div>Details are below</div>
            <div>&nbsp;</div>
            <div>ID : ${req.body.ID},</div>
            <div>ts: ${req.body.ts},</div>
            <div>EquipmentType: ${req.body.EquipmentType},</div>
            <div>Type: ${req.body.Type},</div>
            <div>Status: ${req.body.Status}</div>
            <div>Location: ${address}</div> 
            `
        }

        let user = new User;
        var emailRecipients = await user.emailRecipients()
        emailRecipients = emailRecipients.map(el => el.mailingAddress)

        // to: ['emily.koh@izeem.com','bernardleongqijie@gmail.com','pohkiat@ze.com.sg','marcuschen@ze.com.sg','durai@ze.com.sg','shawnlee@ze.com.sg','thomas@ze.com.sg','jeromeang@ze.com.sg','geraldina.koh@sembcorp.com','seahyw@gmail.com'],
        const data = {
            from: 'iotsupport@izeem.com',
            to: emailRecipients,
            subject: 'One Alarm Trigger Received',
            html: template
        };

        mg.messages().send(data, (error, body)=> {
            res.json(
                {
                    result : body
                }
            )
        });

        var alarm = new Alarm
        var clear = await alarm.clearMailAlarm(req.body.ts, req.body.ID)
    })

    app.get('/getEquipmentWeightCollection/live',async(req, res)=>{
        let auth = new Authetication
        let apikey = await auth.getAPIKeys(req.headers.apikey)
        
        // var type = apikey[0]
        // type = type.type

        if(apikey.length <= 0){
            res.json({
                'success' : false,
                'error' : 'API Keys Incorrect'
            })
            return;
        }

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }
        
        if(accesstoken){
            let checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                let compactor = new Compactor
                let data = compactor.getEquipmentWeightCollection()
                data.then(async(weightCollection)=>{
                    //markkrrr
                    //get the address here
                    let equipments = await compactor.scanEquipmentCurrentStatus()
                    for(var index=0;index<equipments.length;index++){
                        var equipment = equipments[index]
                        for(var i=0;i<weightCollection.length;i++){
                            var weightEvent = weightCollection[i]
                            if(weightEvent.EquipmentID == equipment.EquipmentID){
                                weightCollection[i]["shortAddress"] = equipment.shortAddress
                            }

                            weightCollection[i]["currentWeight"] = Math.round(weightEvent.currentWeight)
                            weightCollection[i]["collectedWeight"] = Math.round(parseFloat(weightEvent["Weight-Collected"]) )
                            weightCollection[i]["collectTS"] = weightEvent["collectedWeight-ts"]

                            delete(weightCollection[i]["insertID"])
                            delete(weightCollection[i]["latestTS"])
                        }
                    }
                    for(var i=0;i<weightCollection.length;i++){
                        delete(weightCollection[i]["collectedWeight-ts"])
                        delete(weightCollection[i]["Weight-Collected"])
                    }

                    weightCollection = sortObjectsArray(weightCollection, 'EquipmentID');

                    res.json({
                        weightCollection : weightCollection
                    })
                })
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })

    app.get('/alarmCurrentStatus/live', async(req, res)=>{
        
        var accesstoken = null
        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }
        if(accesstoken){
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                let compactor = new Compactor
                let equipments = await compactor.scanEquipmentCurrentStatus()
                //highly unlikely but still place condition
                if(equipments.length <= 0){
                    res.json({'success' : false, 'error' : 'No Data'})
                }else{
                    let result = equipments.map(({ EStop, FireAlarm, GateNotClose, TransferScrewMotorTrip, WeightExceedLimit, EquipmentID, DischargeGateMotorTrip, DischargeScrewMotorTrip, BinLifterMotorTrip, MotorTrip, Section, coordinates, shortAddress, address}) => ({ EStop, FireAlarm, GateNotClose, TransferScrewMotorTrip, WeightExceedLimit, EquipmentID, DischargeGateMotorTrip, DischargeScrewMotorTrip, BinLifterMotorTrip, MotorTrip, Section, coordinates , shortAddress, address}));
                    var alarmTypes = ['EStop','FireAlarm','GateNotClose','WeightExceedLimit','TransferScrewMotorTrip','WeightExceedLimit','DischargeScrewMotorTrip','DischargeGateMotorTrip','BinLifterMotorTrip', 'MotorTrip']
                    resultArr = []
                    for(var i=0;i<alarmTypes.length;i++){
                        var alarmType = alarmTypes[i]
                        for(var x=0;x<result.length;x++){
                            var object = {}
                            if( !(!result[x][alarmType] || result[x][alarmType] == {} ) ){
                                var id = result[x]['EquipmentID']
                                object["ts"] = result[x][alarmType]['ts']
                                object["CurrentStatus"] = result[x][alarmType]['CurrentStatus']
                                object["shortAddress"] = result[x]['shortAddress']
                                // if(id.includes('DS')){
                                //     object["EquipmentType"] = 'DS'
                                // }else{
                                //     object["EquipmentType"] = 'MM'
                                // }
                                object["EquipmentID"] = id
                                object["Type"] = alarmType
                                object["Section"] = result[x]['Section']
                                resultArr.push(object)
                            }
                        }
                    }

                    resultArr = compactor.removeDuplicates(resultArr, 'ts')
                    resultArr = sortObjectsArray(resultArr, 'ts', {order: 'desc'});
                    res.json({
                        'success' : true,
                        'alarms' : resultArr
                    })
                }
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })
}

const CompactorRoutes = (app) =>{
    // app.post('/weightCollectionData',async(req, res)=>{
    //     var compactor = new Compactor
    //     var saveWeightCollected = compactor.saveWeightCollected()
    //     saveWeightCollected.then((result)=>{
    //         res.json(result)
    //     })
    // })

    app.get('/Alarms/esri',async(req, res)=>{
        const sortObjectsArray = require('sort-objects-array');
        if(req.headers.apikey == 'esriAlarmAPI'){
            let compactor = new Compactor
            let equipments = await compactor.scanEquipmentCurrentStatus()
            // console.log(equipments)
        // }

            //highly unlikely but still place condition
            if(equipments.length <= 0){
                res.json({'success' : false, 'error' : 'No Data'})
            }else{
                let results = equipments.map(({ EStop, FireAlarm, GateNotClose, TransferScrewMotorTrip, WeightExceedLimit, EquipmentID, DischargeScrewMotorTrip, DischargeGateMotorTrip, BinLifterMotorTrip, MotorTrip, Section }) => ({ EStop, FireAlarm, GateNotClose, TransferScrewMotorTrip, WeightExceedLimit, EquipmentID, DischargeScrewMotorTrip, DischargeGateMotorTrip, BinLifterMotorTrip, MotorTrip, Section }));
                var alarmTypes = ['EStop','FireAlarm','GateNotClose','WeightExceedLimit','TransferScrewMotorTrip','WeightExceedLimit','DischargeScrewMotorTrip','DischargeGateMotorTrip', 'BinLifterMotorTrip', 'MotorTrip']

                resultArr = []
                for(var i=0;i<alarmTypes.length;i++){
                    for(var x=0;x<results.length;x++){
                        var alarmType = alarmTypes[i]
                        var result = results[x]
                        if (Object.keys(result[alarmType]).length !== 0){
                            var object = {}
                            var id = result.EquipmentID
                            // console.log([alarmType,result[alarmType],result["EquipmentID"]])
                            object["ts"] = result[alarmType]['ts']
                            object["Status"] = result[alarmType]['CurrentStatus']
                            if(id.includes('DS')){
                                object["EquipmentType"] = 'DS'
                            }else{
                                object["EquipmentType"] = 'MM'
                            }
                            object["ID"] = id
                            object["Type"] = alarmType
                            object["sectionArea"] = result['Section']
                            resultArr.push(object)
                        }
                    }
                }
                resultArr = sortObjectsArray(resultArr, 'ID');
                res.json({
                    'success' : true,
                    'alarms' : resultArr
                })
            }
        }else{
            res.json({'success' : false, 'error' : 'Esri Alarm API key required'})
        }
    })

    app.get('/Compactor/esri', async(req, res)=>{
        if(req.headers.apikey == 'esriCompactorAPI'){
            let compactor = new Compactor
            let equipments = await compactor.scanEquipmentCurrentStatus()
            //highly unlikely but still place condition
            if(equipments.length <= 0){
                res.json({'success' : false, 'error' : 'No Data'})
            }else{
                let result = equipments.map(({ WeightInformation, EquipmentID, Section }) => ({WeightInformation, EquipmentID, Section}));
                for(var i=0;i<result.length;i++){
                    var id = result[i]['EquipmentID']
                    result[i]['sectionArea'] = result[i]['Section']
                    result[i]['ID'] = result[i]['EquipmentID']
                    result[i]['FilledLevel-Weight'] = result[i]['WeightInformation']['FilledLevel']
                    result[i]['Weight'] = result[i]['WeightInformation']['WeightValue']
                    result[i]['ts'] = result[i]['WeightInformation']['ts'] 

                    if(id.includes('DS')){
                        result[i]['EquipmentType'] = 'DS'
                    }else{
                        result[i]['EquipmentType'] = 'MM'
                    }
                    delete result[i]['EquipmentID']
                    delete result[i]['Section']
                    delete result[i]['WeightInformation']
                }
                res.json({
                    'success' : true,
                    'compactorInfo' : result
                })
            }
        }else{
            res.json({'success' : false, 'error' : 'Esri Compactor API key required'})
        }
    })

    app.get('/CompactorCurrentStatus/live', async(req, res)=>{
        var accesstoken = null

        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
            }
        }
        
        if(accesstoken){
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                let compactor = new Compactor
                let equipments = await compactor.scanEquipmentCurrentStatus()
                //highly unlikely but still place condition
                if(equipments.length <= 0){
                    res.json({'success' : false, 'error' : 'No Data'})
                }else{
                    let result = equipments.map(({ WeightInformation, EquipmentID, Section, coordinates , address, shortAddress }) => ({WeightInformation, EquipmentID, Section, coordinates, address, shortAddress}));
                    for(var i=0;i<result.length;i++){
                        result[i]['FilledLevel'] = result[i]['WeightInformation']['FilledLevel']
                        result[i]['WeightValue'] = result[i]['WeightInformation']['WeightValue']
                        result[i]['ts'] = result[i]['WeightInformation']['ts'] 
                        result[i]['ts'] = result[i]['WeightInformation']['ts'] 
                    
                        if(result[i]['WeightInformation']['FilledLevel'] < 0){
                            result[i]['FilledLevel'] = "0"
                            result[i]['WeightValue'] = "0"
                        }

                        if(result[i]['WeightInformation']['WeightValue'] < 0){
                            result[i]['FilledLevel'] = "0"
                            result[i]['WeightValue'] = "0"
                        }

                        if(!result[i]['WeightInformation']['ts']){
                            result[i]['FilledLevel'] = "0"
                            result[i]['WeightValue'] = "0"
                            result[i]['ts'] = ""
                        }

                        // if(id.includes('DS')){
                        //     result[i]['EquipmentType'] = 'DS'
                        // }else{
                        //     result[i]['EquipmentType'] = 'MM'
                        // }
                        delete result[i]['WeightInformation']
                    }

                    result = sortObjectsArray(result, 'EquipmentID')
                    res.json({
                        'success' : true,
                        'compactorInfo' : result
                    })
                }
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })
}

module.exports = { 
    "CompactorRoutes": CompactorRoutes,
    "AlarmRoutes": AlarmRoutes,
    "Login" : Login,
    "Default" : Default,
    "Download" : Download
}