const axios = require('axios');

class Pdf_controller{

    async generatePDF(pdf, html, options, fileName){
        return new Promise((resolve, reject)=>{
            pdf.create(html, options).toFile(`./${fileName}`, function(err, res) {
                if (err){
                  resolve({'error' : err})
                }else{
                    resolve(res)
                }
            });
        })
    }

    chunkArray(arr, size){
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    }
}

module.exports = Pdf_controller