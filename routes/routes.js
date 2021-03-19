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
const Pdf_controller = require('./../controller/Pdf_controller')
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
    app.get('/generatePDF/:data',async(req, res)=>{
        //mark
        var CryptoJS = require("crypto-js");
        var pdf = require('html-pdf');
        var now = moment().format('MMMM Do YYYY, h:mm:ss a');
        var pdfcontroller = new Pdf_controller
        var sortObjectsArray = require('sort-objects-array');
        var encrypt = req.params.data
        var encrypytkey = 'somekey'
        var bytes  = CryptoJS.AES.decrypt(encrypt, encrypytkey);
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        var starttime = decryptedData['from']
        var endtime = decryptedData['to']
        let dateObj = moment().format('L');
        var yymm = dateObj.split('/')
        yymm = `${yymm[2]}${yymm[0]}`
        var dynamicAlarmTable = `Alarm_${yymm}`

        var alarm = new Alarm(dynamicAlarmTable)
        var allAlarmInfo = await alarm.getAllClearedAlarm()
        for(var i=0;i<allAlarmInfo.length;i++){
            var alarmObj = new Alarm
            var alarmItem = allAlarmInfo[i]
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
            allAlarmInfo[i]['EquipmentID'] = allAlarmInfo[i]['ID']
            allAlarmInfo[i]['EquipmentType'] = allAlarmInfo[i]['Type']
            allAlarmInfo[i]['timeDifference'] = time_difference

            delete(allAlarmInfo[i]['ID'])
            delete(allAlarmInfo[i]['EquipmentType'])
        }

        var renderAlarms = []

        for(var i=0;i<allAlarmInfo.length;i++){
            if(starttime !== endtime){
                var todaydate = moment(allAlarmInfo[i]['ts']).format()
                todaydate = new Date(todaydate).getTime()
                var startTime = new Date(starttime).getTime()
                var endTime = new Date(endtime).getTime()
                if(startTime <= todaydate && endTime >= todaydate){
                    renderAlarms.push(allAlarmInfo[i])
                }
            }
            else{
                var todaydate = moment(allAlarmInfo[i]['ts']).format()
                todaydate = new Date(todaydate).getTime()
                var startTime = new Date(starttime).getTime()
                var endTime = new Date(endtime).getTime()
                if(startTime <= todaydate){
                    renderAlarms.push(allAlarmInfo[i])
                }
            }
        }        
        //
        for(var i=0;i<renderAlarms.length;i++){
            var renderAlarm = renderAlarms[i]
            var ts = renderAlarm.ts
            ts = ts.split(' ')
            renderAlarms[i]['timestampday'] = ts[0]
            renderAlarms[i]['timestamptime'] = ts[1]
            var clearts = renderAlarm.ClearedTS
            if(typeof(clearts) == 'undefined'){
                renderAlarms[i]['cleartimestampday'] = ''
                renderAlarms[i]['cleartimestamptime'] = ''
            }else{
                clearts = clearts.split(' ')
                renderAlarms[i]['cleartimestampday'] = clearts[0]
                renderAlarms[i]['cleartimestamptime'] = clearts[1]
            }
        }
        renderAlarms = sortObjectsArray(renderAlarms, 'ts', {order: 'desc'})
        renderAlarms = pdfcontroller.chunkArray(renderAlarms , 5)
        // console.log(renderAlarms)

        for(var blockIndex=0;blockIndex<renderAlarms.length;blockIndex++){
            var renderAlarmsBlock = renderAlarms[blockIndex]

            for(var index=0;index<renderAlarmsBlock.length;index++){
                    var alarm = renderAlarmsBlock[index]
                    var tableContent = `
                        <tr>
                        <td style="text-align: center">${alarm.EquipmentID}</td>
                            <td style="text-align: center"><div>${alarm.timestampday}</div><div>${alarm.timestamptime}</div></td>
                            <td style="text-align: center"><div>${alarm.cleartimestampday}</div><div>${alarm.cleartimestamptime}</div></td>
                            <td style="text-align: center">${alarm.timeDifference}</td>
                            <td style="text-align: center">${alarm.Type}</td>
                            <td style="text-align: center">${alarm.Status}</td>
                        </tr>
                    `
                    renderAlarms[blockIndex][index] = tableContent
                    // contentPages.push({table: tableContent,pageNo: blockIndex+1})
            }
        }

        for(var blockIndex=0;blockIndex<renderAlarms.length;blockIndex++){
            var renderAlarmsBlock = renderAlarms[blockIndex]
            renderAlarmsBlock = renderAlarmsBlock.join('')
            renderAlarmsBlock = `
            <table>
                <tr>
                <td style="text-align: center">ID</td>
                    <td style="text-align: center">Alarm ts</td>
                    <td style="text-align: center">Alarm Clear ts</td>
                    <td style="text-align: center">SLA</td>
                    <td style="text-align: center">Alarm Type</td>
                    <td style="text-align: center">Fault Type</td>
                </tr>
                ${renderAlarmsBlock}
            </table>`
            renderAlarms[blockIndex] = renderAlarmsBlock
        }


        var style = `
        <head>
    <meta charset="utf-8" />
    <style type="text/css" media="screen,print">
        .new-page {
            page-break-before: always;
        }

        table {
            font-family: arial, sans-serif;
            border-collapse: collapse;
            width: 100%;
        }
            
        td, th {
        border: 1px solid #dddddd;
        text-align: left;
        padding: 8px;
        }
        
        tr:nth-child(even) {
        background-color: #dddddd;
        }

        .faultReportTitle{
            margin-left: '100em'
        }
        .alarmTitle{
            margin-top: 0.5em;
            font-size: 2em;
            text-align: center;
        }
        .iZee{
            color:black;
        }
        .Sync{
            color: #ff0100;
        }
    </style>
</head>
<body>`

        var title = `<h1 class="alarmTitle">
        <span class='iZee'>iZee<span class='Sync'>Sync</span></span>

        </h1>
        <div>&nbsp;</div>
        `
        var ReportInfo =  `<div class='faultReportTitle'>
                    <strong>Equipment Fault Report</strong></div>
                    <div>&nbsp;</div>
                    <div>
                        From: ${decryptedData.from}
                    </div>
                    <div>
                        To: ${decryptedData.to}
                        </div>
                        <div>Report Generation Date: ${now}</div>
                        <div>&nbsp;</div>
                        <div>&nbsp;</div>
                    <div>
                    `
        
        var contentPages = [style]

        for(var i=0;i<renderAlarms.length;i++){
            var alarmTable = renderAlarms[i]
            if(i == 0){
                contentPages.push(
                    `
                    <div>
                        ${title}
                        ${ReportInfo}
                        ${alarmTable}
                    </div>
                    `
                ) 
            }else{
                contentPages.push(
                    `
                    <div class="new-page">
                        <div>&nbsp;</div>
                        ${title}
                        ${alarmTable}
                    </div>
                    `
                )
            }
        }
        contentPages.push('</body>')
        var html = contentPages.join("")
        // encodeURIComponent()
        // var data = {"from" : "2021-01-25","to" : "2021-01-25"}

        // in charge of generatePDF and Upload
        var options = { format: 'Letter' };

        var date = moment().format('L');
        var yymmdd = date.split('/')
        yymmdd = `${yymmdd[2]}${yymmdd[0]}${yymmdd[1]}`
        var fileName = `alarmReportPDF_${yymmdd}.pdf`
        var generatePDF = await pdfcontroller.generatePDF(pdf,html,options,fileName)
        var file = `${__dirname}/../${fileName}`;
        res.download(file);
    })

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

    app.get('/generatexlxs/weightReport/:data',async(req, res)=>{
        var encrypt = req.params.data
        var encrypytkey = 'somekey'
        var bytes  = CryptoJS.AES.decrypt(encrypt, encrypytkey);
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        var isSelectedID = false
        var isDaterange = false
        var selectedArr = []

        var tempArr = []
        var tempArray = []
        var compactor = new Compactor
        //marking
        var compactorReport = await compactor.getEquipmentWeightCollection()
        let equipments = await compactor.scanEquipmentCurrentStatus()

        for(var index=0;index<equipments.length;index++){
            var equipment = equipments[index]
            for(var i=0;i<compactorReport.length;i++){
                var weightEvent = compactorReport[i]
                if(weightEvent.EquipmentID == equipment.EquipmentID){
                    compactorReport[i]["shortAddress"] = equipment.shortAddress
                }

                compactorReport[i]["currentWeight"] = Math.round(weightEvent.currentWeight)
                compactorReport[i]["collectedWeight"] = Math.round(parseFloat(weightEvent["Weight-Collected"]) )
                compactorReport[i]["collectTS"] = weightEvent["collectedWeight-ts"]

                delete(compactorReport[i]["insertID"])
                delete(compactorReport[i]["latestTS"])
            }
        }

        for(var i=0;i<compactorReport.length;i++){
            delete(compactorReport[i]["collectedWeight-ts"])
            delete(compactorReport[i]["Weight-Collected"])
        }

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
                for(var index=0;index<compactorReport.length;index++){
                    var alarm = compactorReport[index]
                    if(alarm.EquipmentID == id){
                        tempArr.push(compactorReport[index])
                    }
                }
            }
            tempArr = sortObjectsArray(tempArr, 'ts', {order: 'desc'})
            compactorReport = tempArr
        }

        if(isDaterange){
            var dateRangeObject = decryptedData.dateRange
            var startDate = dateRangeObject.starttime
            var endDate = dateRangeObject.endtime
            
            for(var i=0;i<compactorReport.length;i++){
                var data = compactorReport[i]
                if(startDate !== '' || endDate !== ''){
                    if(startDate <= endDate){
                        if(data.collectTS >= startDate && data.collectTS <= endDate){
                            tempArray.push(compactorReport[i])
                        }
                    }
                }
            }
            compactorReport = tempArray
        }

        if(isDaterange && isSelectedID){
            var tempArray = []
            var tempArr = []
            var dateRangeObject = decryptedData.dateRange
            var startDate = dateRangeObject.starttime
            var endDate = dateRangeObject.endtime

            for(var i=0;i<selectedArr.length;i++){
                var id = selectedArr[i]
                for(var index=0;index<compactorReport.length;index++){
                    var alarm = compactorReport[index]
                    if(alarm.EquipmentID == id){
                        tempArr.push(compactorReport[index])
                    }
                }
            }

            for(var i=0;i<tempArr.length;i++){
                var data = tempArr[i]
                if(startDate !== '' || endDate !== ''){
                    if(startDate <= endDate){
                        if(data.collectTS >= startDate && data.collectTS <= endDate){
                            tempArray.push(tempArr[i])
                        }
                    }
                }
            }

            if(tempArray > 0){
                tempArray = sortObjectsArray(tempArray, 'collectTS', {order: 'desc'})
            }
            compactorReport = tempArray
        }

        compactorReport = sortObjectsArray(compactorReport, 'ts', {order: 'desc'})
        var exportObj = new Excel
        const workSheetColumnNames = [
            "Equipment ID",
            "Short Address",
            "Weight Collection Time",
            "Amount Collected",
            'Equipment Remaining Weight'
        ]
        var workSheetName = 'alarmExcel'
        var date = moment().format('L');
        var yymmdd = date.split('/')
        yymmdd = `${yymmdd[2]}${yymmdd[0]}${yymmdd[1]}`
        
        var filePath = `./weightReport_${yymmdd}.xlsx`
        exportObj.exportDataToExcel(compactorReport, workSheetColumnNames, workSheetName, filePath, 'weight')

        var file = `${__dirname}/../${filePath}`;
        res.download(file);
    })
}

const Login = (app) => {

    app.get('/getCurrentUser',async(req, res)=>{
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
            var auth = new Authetication;
            var checktoken = await auth.checkToken(accesstoken, type)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                let getUserNameFromToken = auth.getUserNameFromToken(accesstoken)
                getUserNameFromToken.then((userDetails)=>{
                    var { username, password } = userDetails
                    res.json({
                        'success' : true,
                        'username' : username,
                        'password' : password
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
            let type = req.body.type
            let username = req.body.username
            let password = req.body.password
            auth.autheticate(username, password, type).then((result)=>{
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
            let type = req.body.type
            //search token whether is a valid token
            let auth = new Authetication
            auth.checkToken(token, type).then((count)=>{
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

    app.get('/getAlarmReport/all',async(req, res)=>{
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
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken, type)
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

    app.get('/getDetailAlarm',async(req, res)=>{
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
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken, type)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                var date = moment().format('L');
                var yymm = date.split('/')
                yymm = `${yymm[2]}${yymm[0]}`

                var getAlarmTable = `Alarm_${yymm}`

                var alarm = new Alarm(getAlarmTable)
                let allAlarm = await alarm.getAllAlarm()

                let compactor = new Compactor
                allAlarm = allAlarm.Items
                for(i=0;i<allAlarm.length;i++){
                    var compactorDetails = await compactor.getCompactorInfo(allAlarm[i].compactorID)
                    allAlarm[i]['sectionArea'] = compactorDetails.Item.sectionArea
                }
        
                res.json({
                    'alarmInfo' : allAlarm
                })
            }
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })

    app.get('/getTodaysAlarm/:section',async(req, res)=>{
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        var accesstoken = null
        //ask for 
        if(req.headers.authorization){
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
                accesstoken = null
            }
        }
        if(accesstoken){
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken, type)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                //get AlarmToday's table, we assume alarm raised is in Alarm_thisMonth

                var todayDate = moment().format('L')
                var yymm = todayDate.split('/')
                yymm = `${yymm[2]}${yymm[0]}`

                var getAlarmTable = `Alarm_${yymm}`

                var alarm = new Alarm(getAlarmTable)
                let allAlarm = alarm.getAllAlarm()

                allAlarm.then(async(alarms)=>{
                    var alarmArr = []
                    if(alarms.Count > 0){
                        var allAlarms = alarms.Items
                        for(i=0;i<allAlarms.length;i++){
                            if(moment(allAlarms[i].timeStamp).format('L') == todayDate){
                                let comactorObj = new Compactor
                                let compactorInfo = await comactorObj.getCompactorInfo(allAlarms[i].compactorID)
                                if(compactorInfo.Item.sectionArea == req.params.section){
                                    alarmArr.push(allAlarms[i])
                                }
                            }
                        }
                        if(alarmArr.length <= 0){
                            res.json({
                                'success' : true,
                                'alarms' : [],
                                'message' : 'No Alarm Raised'
                            })
                        }else{
                            res.json({
                                'success' : true,
                                'alarms' : alarmArr
                            })
                        }
                    }else{
                        res.json({
                            'success' : true,
                            'message' : 'No Alarm Raised'
                        })
                    }
                })
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
    })

    app.get('/getTodaysAlarms/live',async(req, res)=>{
        var todayDate = moment().format('L')
        var yymm = todayDate.split('/')
        yymm = `${yymm[2]}${yymm[0]}`

        var getAlarmTable = `Alarm_${yymm}`

        var alarm = new Alarm(getAlarmTable)
        let allAlarm = await alarm.getAllLiveAlarm()
        
        var todaysDate = new Date().toISOString().split('T')[0]
        let alarmData = []
        allAlarm = allAlarm.Items
        for(var i =0;i<allAlarm.length;i++){
            var date = allAlarm[i].ts.split(' ')
            date = date[0]
            if(date == todaysDate){
                allAlarm[i]['sectionArea'] = 'CBM'
                alarmData.push(allAlarm[i])
            }
        }

        res.json({
            'success' : true,
            'alarms' : alarmData
        })
    })

    app.get('/getAllAlarms/live', async(req,res)=>{
        let dateObj = moment().format('L');
        var yymm = dateObj.split('/')
        yymm = `${yymm[2]}${yymm[0]}`
        var dynamicAlarmTable = `Alarm_${yymm}`

        var alarm = new Alarm(dynamicAlarmTable)
        var allAlarmInfo = alarm.getAllLiveAlarm()
        allAlarmInfo.then((result)=>{
            res.json({'alarmInfo' : result.Items})
        }).catch((err)=>{
            res.json({'error' : err})
        })
    })

    app.get('/AlarmCurrentStatus/live', async(req, res)=>{
        
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
    })
}

const CompactorRoutes = (app) =>{
    app.post('/weightCollectionData',async(req, res)=>{
        var compactor = new Compactor
        var saveWeightCollected = compactor.saveWeightCollected()
        saveWeightCollected.then((result)=>{
            res.json(result)
        })
    })
    //can be done by admin
    app.post('/compactorDetailReport',async(req, res)=>{
        //scan all compactor
    })
    
    app.post('/editCompactor',async(req,res)=>{
        //only done by admin
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }
    
        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        if(type == 'user' || type == 'serviceUser'){
            res.json({
                'success' : false,
                'error' : `${type} Cannot Perform This Action`
            })
        }

        if(req.headers.authorization){
            //scan thru accesscontroltable
            var token = req.headers.authorization.split(' ')
            if(token[0] == 'Bearer'){
                accesstoken = token[1]
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please use bearer token to log in'
                })
                accesstoken = null
            }
            if(accesstoken){
                let auth = new Authetication
                let checktoken = await auth.checkToken(accesstoken, type)
                if(checktoken <= 0){
                    res.json({
                        'success' : false,
                        'error' : 'Invalid token'
                    })
                }else{
                    let compactor = new Compactor
                    var compactorDetails = {
                        "address" : req.body.address,
                        "compactorType" : req.body.compactorType,
                        "sectionArea" : req.body.sectionArea
                    }
                        compactor.editCompactor(req.body.compactorID,compactorDetails)
                        res.json({'success' : true})
                    }
                }
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please log in first'
                })
            }
        })        
    //login using normal user
    app.get('/getCompactorInfo/:compactorID', async(req, res)=>{
        //user and admin can access
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }
    
        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }

        if(type == 'serviceUser'){
            res.json({
                'success' : false,
                'error' : `${type} Cannot Perform This Action`
            })
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
                accesstoken = null
            }

            if(accesstoken){
                let auth = new Authetication
                let checktoken = await auth.checkToken(accesstoken, type)
                if(checktoken <= 0){
                    res.json({
                        'success' : false,
                        'error' : 'Invalid token'
                    })
                }else{
                    //if dont have throw error
                    var compactorID = req.params.compactorID
                    let compactor = new Compactor
                    var compactorInfo = compactor.getCompactorInfo(compactorID)
                    compactorInfo.then((result)=>{
                        res.json({'compactorInfo' : result.Item})
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

    app.get('/allCompactorInfo/:section', async(req, res)=>{
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        if(type == 'serviceUser'){
            res.json({
                'success' : false,
                'error' : `${type} Cannot Perform This Action`
            })
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
                accesstoken = null
            }
            if(accesstoken){
                let auth = new Authetication
                let checktoken = await auth.checkToken(accesstoken, type)
               
                if(checktoken <= 0){
                    res.json({
                        'success' : false,
                        'error' : 'Invalid token'
                    })
                }
                else{
                    let compactor = new Compactor
                    var allCompactInfo = compactor.scanAllCompactor()
                    
                    allCompactInfo.then((result)=>{
                         let compactors = result.Items
                         var compactorResult = []
                         for(i=0;i<compactors.length;i++){
                             if(compactors[i].sectionArea == req.params.section){
                                 compactorResult.push(compactors[i])  
                             }
                         }
                    
                         if(compactorResult.length <= 0){
                             res.json(
                                 {
                                     'compactorResult' : [],
                                     'message' : 'No compactors in this section'
                                 }
                             )
                         }else{
                             res.json({'compactorInfo' : compactorResult})
                         }
                    }).catch((err)=>{
                        console.log(err)
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

    app.get('/allCompactorAddresses/live', async(req, res)=>{
        let compactor = new Compactor()
        var allCompactorAddresses = compactor.scanAllLiveCoordinates()
        allCompactorAddresses.then((result)=>{
            res.json({'compactorAddresses' : result})
        }).catch((err)=>{
            console.log(err)
        })
    })

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
        const sortObjectsArray = require('sort-objects-array');
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
    })
}


module.exports = { 
    "CompactorRoutes": CompactorRoutes,
    "AlarmRoutes": AlarmRoutes,
    "Login" : Login,
    "Default" : Default,
    "Download" : Download
}