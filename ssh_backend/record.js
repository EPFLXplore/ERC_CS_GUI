const fs = require('fs');
const path = require('path');

/**
 * Checks if a CSV file exists, and if it does, backs it up.
 * It creates a new CSV file with the specified format line also
 * @param {*} homeDir the home directory of the user to backup the file
 * @param {*} file_to_check name of the file. For example: "sensor_data"
 * @param {*} format_line the format of data. For example: "timestamp, temp, pression\n"
 */ 
function checkCSVFileExists(homeDir, file_to_check, format_line) {
    if(fs.existsSync(file_to_check)) {
        backupCSV(homeDir, file_to_check);
    }

    createCSVFile(file_to_check, format_line);
}

/**
 * Create a CSV file if it does not exist.
 * @param {*} name_file name of the file to create. For example: "sensor_data"
 * @param {*} format_line the format of data. For example: "timestamp, temp, pression\n"
 */
function createCSVFile(name_file, format_line) {
    if (!fs.existsSync(name_file)) {
        fs.writeFileSync(`${name_file}.csv`, format_line);
    }
}

/**
 * Bsckup a CSV file by copying it to a new file with a timestamp.
 * @param {*} homeDir the home directory of the user to backup the file
 * @param {*} file_name_to_backup name of the file. For example: "sensor_data"
 */
function backupCSV(homeDir, file_name_to_backup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(homeDir, 'dev_ws/src/frontend/ssh_backend/', `${file_name_to_backup}.csv`);
    const backupPath = path.join(homeDir, "dev_ws/src/sensor_data/", `${file_name_to_backup}_backup_${timestamp}.csv`);

    fs.copyFileSync(csvPath, backupPath);

    fs.unlink(csvPath, (err) => {
        if (err) {
            console.error('Error deleting CSV file:', err);
        } else {
            console.log('CSV file deleted successfully.');
        }
    });
}

module.exports = {
    checkCSVFileExists,
    backupCSV
}