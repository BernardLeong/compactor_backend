const moment = require('moment')
const Alarm = require('./../model/Alarm')
const Compactor = require('./../model/Compactor')
const User = require('./../model/User')
const Authetication = require('./../model/Authetication')


const Default = (app) => {
    app.get('/',async(req, res)=>{
        res.json(
            {
                'message' : 'Welcome to iZeem Backend API'
            }
        )
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
                    console.log(username)
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

    app.post('/editUser',async(req, res)=>{
        //can only edit self
        //get userid
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }

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
            let user = new User
            let userid = await user.getUserIDFromToken(accesstoken)
            var editUserDetails = { 'username' : req.body.username, 'password' : req.body.password}
            user.editUserDetails(userid, type, editUserDetails)
        }else{
            res.json(
                {
                    'error' : 'Please log in first'
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
                res.json(result)
            }).catch((err)=>{
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
                let alarm = new Alarm
                let compactor = new Compactor
                var allAlarm = await alarm.getAllAlarm()
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
                var todayDate = moment().format('L')
                var alarm = new Alarm
                let allAlarm = alarm.getAllAlarm()
                allAlarm.then(async(alarms)=>{
                    var alarmArr = []
                    if(alarms.Count > 0){
                        var allAlarms = alarms.Items
                        for(i=0;i<allAlarms.length;i++){
                            if(moment(allAlarms[i].timestamp).format('L') == todayDate){
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

    app.get('/getTodaysAlarm',async(req, res)=>{
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }

        //ask for 
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
                var todayDate = moment().format('L')
                var alarm = new Alarm
                let allAlarm = alarm.getAllAlarm()
                allAlarm.then((alarms)=>{
                    var alarmArr = []
                    if(alarms.Count > 0){
                        var allAlarms = alarms.Items
                        for(i=0;i<allAlarms.length;i++){
                            if(moment(allAlarms[i].timestamp).format('L') == todayDate){
                                alarmArr.push(allAlarms[i])
                            }
                        }
                        res.json({
                            'success' : true,
                            'alarms' : alarmArr
                        })
                    }else{
                        res.json({
                            'success' : true,
                            'message' : 'No Alarm Raised'
                        })
                    }
                }).catch((err)=>{
                    res.json(
                        {
                            'success' : false,
                            'error' : err,
                        }
                    )
                })
            }
        }
    })


    app.post('/clearAlarm',async(req, res)=>{
         //can be raised by enginner and admin
         var type = 'user'
         if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
             type = 'admin'
         }
 
         if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
             type = 'serviceUser'
         }

         if(type == 'user'){
             res.json({
                 'success' : false,
                 'error' : 'Normal User Cannot Perform This Action'
             })
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
             }
         }
 
         if(accesstoken){
             if(req.body.compactorID){
                let alarm = new Alarm
                let compactor = new Compactor
                var alarmID = req.body.AlarmID
                var compactorID = req.body.compactorID

                alarm.clearAlarm(alarmID)

                let getAlarm = await alarm.getAlarm(compactorID)
                if(getAlarm.length <= 0){
                    compactor.clearAlarmRaised(compactorID)
                }
 
                res.json(
                    {
                        'success' : true,
                        'message' : 'Alarm cleared successfully'
                    }
                )
            }else{
                res.json(
                    {
                        'success' : false,
                        'error' : 'Please provide compactorID'
                    }
                )
            }
        }
    })

    app.post('/raiseAlarm',async(req, res)=>{
        //can be raised by enginner and admin
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        if(type == 'user'){
            res.json({
                'success' : false,
                'error' : 'Normal User Cannot Perform This Action'
            })
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
            }
        }

        if(accesstoken){
            let auth = new Authetication
            let checktoken = await auth.checkToken(accesstoken, type)
            console.log(checktoken)
            if(checktoken <= 0){
                res.json({
                    'success' : false,
                    'error' : 'Invalid token'
                })
            }else{
                var alarmType = req.body.alarmType
                var alarmStatus = req.body.alarmStatus
                //get userid from token
                // var userid = req.body
                var userid = null
                
                auth.getIDFromToken(accesstoken,type).then(async(result)=>{
                    if(result[0].adminUserID){
                        userid = result[0].adminUserID
                    }else{
                        userid = result[0].serviceUserID
                    }
                    var compactor = new Compactor
                    var compactorID = req.body.compactorID
                    let compact = await compactor.getCompactorInfo(compactorID)
                    var alarmDetails = {
                        "type" : alarmType,
                        "status" : alarmStatus,
                        "userid" : userid,
                        "address" : compact.Item.address
                    }
                        let alarm = new Alarm
                
                    if(compactorID){
                        alarm.raisedAlarm(compactorID, alarmDetails)
                        res.json({
                            "success" : true
                        })
                    }else{
                        res.json({
                            "success" : false
                        })
                    }
                })
            }
        }
    })

    //user rights , read only
    app.get('/getAlarm/:compactorID',async(req, res)=>{
        //can be read by enginner, user and admin
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
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
                    var compactorID = req.params.compactorID

                    let dateObj = moment().format('L');
                    var yymm = dateObj.split('/')
                    yymm = `${yymm[2]}${yymm[0]}`
                    var dynamicAlarmTable = `Alarm_${yymm}`
            
                    var alarm = new Alarm(dynamicAlarmTable)
                    var alarmInfo = alarm.getAlarm(compactorID)
                    alarmInfo.then((result)=>{
                        res.json({'alarmInfo' : result})
                    }).catch((err)=>{
                        res.json({'error' : err}) 
                    })
                }
            }
        }
       
    })

    //user rights , read only
    app.get('/getAllAlarm', async(req,res)=>{
        //can be read by enginner, user and admin
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }

        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        //need to login first
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
                    //if dont have throw error
                    var alarm = new Alarm
                    var allAlarmInfo = alarm.getAllAlarm()
                    allAlarmInfo.then((result)=>{
                        res.json({'alarmInfo' : result.Items})
                    }).catch((err)=>{
                        res.json({'error' : err})
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
    //can be done by admin
    app.post('/compactorDetailReport',async(req, res)=>{
        //scan all compactor
    })
    app.post('/addMachine',async(req, res)=>{
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
                        "coordinate" : req.body.coordinate,
                        "type" : req.body.type,
                        "weight" : req.body.weight
                    }
                
                    if(! (req.body.address && req.body.coordinate && req.body.type && req.body.weight)){
                        res.json({'error' : "Address, coordinate, type and weight cannot be null"})
                    }else{
                        compactor.addMachine(req.body.compactorID,compactorDetails).then((result)=>{
                            //do not allow no address, coordinate, type ,weight
                            res.json({'success' : true})
                        }).catch((err)=>{
                            res.json({'error' : err})
                        })
                    }
                }
            } 
        }else{
            res.json({
                'success' : false,
                'error' : 'Please log in first'
            })
        }
    })

    app.post('/offMachine',async(req, res)=>{
        var type = 'user'
        if(req.headers.apikey == 'jnjirej9reinvuiriuerhuinui'){
            type = 'admin'
        }
    
        if(req.headers.apikey == 'juit959fjji44jcion4moij0kc'){
            type = 'serviceUser'
        }
        if(type == 'user'){
            res.json({
                'success' : false,
                'error' : `Normal User Cannot Perform This Action`
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
                }
                else{
                    let compactor = new Compactor
                    let compactorID = req.body.compactorID
                    let offEngine = compactor.offEngine(compactorID)
                    offEngine.then((result)=>{
                        res.json({
                            'alarmStatus' : result.Attributes.alarmStatus,
                            'success' : true
                        })
                    }).catch((err)=>{
                        res.json(
                            {
                                'error' : err,
                                'success' : false
                            }
                        )
                    })
                }
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please log in first'
                })
            }
        
        }
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
    
    app.post('/onMachine',async(req, res)=>{
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
                    // res.json({'hi' : req.body.lol})
                    let dateObj = moment().format('L');
                    var yymmdd = dateObj.split('/')
                    yymmdd = `${yymmdd[2]}${yymmdd[0]}${yymmdd[1]}`
                    var dynamicCompactTableName = `Compactor_${yymmdd}`
                    var compactorID = req.body.compactorID
                    let compactor = new Compactor(dynamicCompactTableName)
                    compactor.onMachineOn(compactorID)
                    res.json({'success' : true})
                }
            }else{
                res.json({
                    'success' : false,
                    'error' : 'Please log in first'
                })
            }
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

    app.get('/allCompactorInfo', async(req, res)=>{
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
                    res.json({'compactorInfo' : result.Items})
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
    
    app.get('/CompactorInfo/:today', async(req, res)=>{
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
                    if(req.params.today == 'today'){
                        let dateObj = moment().format('L');
                        var yymmdd = dateObj.split('/')
                        yymmdd = `${yymmdd[2]}${yymmdd[0]}${yymmdd[1]}`
                        var dynamicCompactTableName = `Compactor_${yymmdd}`
                        var compactor = new Compactor(dynamicCompactTableName)
                    }else{
                        var compactor = new Compactor
                    }
                    var allCompactInfo = compactor.scanAllCompactor()
                    allCompactInfo.then((result)=>{
                        console.log(result.Items)
                        res.json({'compactorInfo' : result.Items})
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
}


module.exports = { 
    "CompactorRoutes": CompactorRoutes,
    "AlarmRoutes": AlarmRoutes,
    "Login" : Login,
    "Default" : Default
}