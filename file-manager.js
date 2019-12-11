/**
 * file manager
 */
const fs = require("fs");
exports.FileManager = {
    readJsonFile: filePath => {
        try {
            return require(filePath);
        } catch (error) {
            console.log(`${filePath} is not found!`);
            return null;
        }
    },
    writeJsonFile: (filePath, json_str) => {
        fs.writeFile(filePath, json_str, "utf8", err => {
            console.log(err);
        });
    }
};
