// const cron = require('node-cron');
// var AWS = require("aws-sdk");
// const User = require('../model/User');

const scheduleCron = (cron, compactor, user, auth) => {
    cron.schedule('0,30 * * * *', async()=> {
        var saveWeightCollected = await compactor.saveWeightCollected()
        console.log(saveWeightCollected)
    })

    cron.schedule('0 2 * * *', async()=> {
        //invalidate all tokens every 2 hr
        var getListofTokens = await user.getListofTokens()
        getListofTokens = getListofTokens.filter(Boolean)
        if(getListofTokens.length > 0){
            for (var token of getListofTokens) {
                auth.invalidateToken(token)
            }
        }else{
            return;
        }
    })
    
    cron.schedule('0 0 * * *', async()=> {
        //schedule for purging of token
        var getAllExpiredTokens = await user.getListofInvalidTokens()
        getAllExpiredTokens = getAllExpiredTokens.filter(Boolean)
        if(getAllExpiredTokens.length <= 0){
            return;
        }else{
            for (var token of getAllExpiredTokens) {
                auth.deleteToken(token)
            }
        }
    })
}

module.exports = scheduleCron


