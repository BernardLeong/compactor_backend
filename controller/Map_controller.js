const axios = require('axios');

class Mapping_controller{

    fetchAddress(address){
        var parsedAddress = encodeURIComponent(address)
        var url = `https://developers.onemap.sg/commonapi/search?searchVal=${parsedAddress}&returnGeom=Y&getAddrDetails=Y`
        console.log(url)
        var fetchdata = axios.get(url)
        return fetchdata
    }

    getCoordinates(address, postalcode){
        var coordinateData = this.fetchAddress(address)
    }
}

module.exports = Mapping_controller