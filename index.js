//lambda will generate compactor_YYMMDD at the fist of every month


const express = require('express')

const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const Mapping_controller = require('./controller/Map_controller')

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const { AlarmRoutes, CompactorRoutes, Login, Default, Download} = require('./routes/routes')

//onMachine

AlarmRoutes(app)
CompactorRoutes(app)
Login(app)
Default(app)
Download(app)

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

app.listen(8080)