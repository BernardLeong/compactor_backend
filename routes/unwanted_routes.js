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