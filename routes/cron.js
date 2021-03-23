const cron = require('node-cron');
var AWS = require("aws-sdk");

const scheduleCron = (cron, compactor) => {
    cron.schedule('0,30 * * * *', async()=> {
        var saveWeightCollected = await compactor.saveWeightCollected()
        console.log(saveWeightCollected)
    })
}



module.exports = scheduleCron


