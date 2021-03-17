const xlsx = require('xlsx')
const path = require('path')

class Excel{
    constructor(){
    }
    exportExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
        const workBook = xlsx.utils.book_new()
        const workSheetData = [
            workSheetColumnNames,
            ... data
        ]
        const workSheet = xlsx.utils.aoa_to_sheet(workSheetData)
        xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName)
        xlsx.writeFile(workBook, path.resolve(filePath))
    } 

    exportDataToExcel = (eventData, workSheetColumnNames, workSheetName, filePath) =>{
        const data = eventData.map(evntData => {
            return [evntData.ClearedTS, evntData.ts, evntData.Status, evntData.Type, evntData.EquipmentID, evntData.timeDifference]
        })
        this.exportExcel(data, workSheetColumnNames, workSheetName, filePath)
    }

}

module.exports = Excel



