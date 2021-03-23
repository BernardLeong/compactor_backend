//lambda will generate compactor_YYMMDD at the fist of every month


const express = require('express')

const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const Mapping_controller = require('./controller/Map_controller')
const scheduleCron = require('./routes/cron')
const cron = require('node-cron');

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const { AlarmRoutes, CompactorRoutes, Login, Default, Download} = require('./routes/routes')
const Compactor = require('./model/Compactor')
//onMachine

AlarmRoutes(app)
CompactorRoutes(app)
Login(app)
Default(app)
Download(app)

var compactor = new Compactor
scheduleCron(cron,compactor)

// cron.schedule('* * * * *', ()=> {
//     var docClient = new AWS.DynamoDB.DocumentClient(
//         {
//             region: 'ap-southeast-1',
//             accessKeyId: 'AKIAWUC2TK6CHAVW5T6V',
//             secretAccessKey: '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'
//         }
//     );
    
//     var table = "testTable";
    
//         var params = {
//             TableName:table,
//             Item:{
//                 "id": Date.now().toString(),
//                 "content" : "haha"
//             }
//     };
//     docClient.put(params, function(err, data) {
//         if (err) {
//             console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
//         } else {
//             console.log("Added item:", JSON.stringify(data, null, 2));
//         }
//     });
// });



app.post('/getFullAddresses',(req, res)=>{
    //return Arr of addressSearchValues
    var address = req.body.address
    let mapController = new Mapping_controller
    var fetchAddressPromise = mapController.fetchAddress(address)
    fetchAddressPromise.then((result)=>{
        addressData = result.data.results
        var addressData = addressData.map(resultAdd => resultAdd.ADDRESS)
        res.json({'address' : addressData})
    }).catch((err)=>{
        res.json({'error' : err})
    })
})

app.post('/returnCoordinates',(req, res)=>{
    var address = req.body.address
    let mapController = new Mapping_controller
    var fetchAddressPromise = mapController.fetchAddress(address)
    fetchAddressPromise.then((result)=>{
        console.log(result.data.results)
        res.json({'hii' : result.data.results})
    }).catch((err)=>{
        res.json({'error' : err})
    })
    // res.json({'hii' : "result"})
})

app.listen(80)