const fs = require('fs');

module.exports = {
  /**
  * Utility to read a file as a promise
  */
  readFile(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (error, data) => error ? reject(error) : resolve(data));
    })
  },
  /**
  * Utility to read a file as array of lines
  */
  readLines(filePath) {
    const fileContent = fs.readFileSync(filePath, 'UTF-8');
    const lines = fileContent.split(/\r?\n/);
    return lines;
  },
  /**
 * Utility to read a file as JSON object
 */
  readJSON(filePath) {
    const fileContent = fs.readFileSync(filePath, 'UTF-8');
    const obj = JSON.parse(fileContent);
    return obj;
  },

   /**
   * Utility to remove elements from array
   */
  arrayRemove(arr, value) {
    return arr.filter(function (ele) { return ele != value; });
  },

  /**
  * Utility to separate a name by charachter case
  */
  separateNameByUpperCase(name) {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1.$2');
  },
  /**
  * Utility to split a string by separators ' '_.:;?!~,`"&|()<>{}\[\]\r\n/\\
  */
  splitBySeparators(s) {
    return s.split(/[ _.:;?!~,`"&|()<>{}\[\]\r\n/\\]+/).filter(w => w !== '');
  },
  /**
  * Utility to split a string by separators non alphabet characters
  */
  splitByNonAlphabet(s) {
    return s.split(/[^a-z]/i).filter(w => w !== '');
  },
  
  /**
  * Utility to split a name by charachter case
  */
  getRelativeFilePath(filePath, baseDirectory) {
    if (filePath.toLowerCase().startsWith(baseDirectory.toLowerCase())) {
      return filePath.substring(baseDirectory.length);
    }
    return filePath;
  },
  /**
  * Utility to check if file ends with any of extensions
  */
  isFileExtensionInList(filePath, extensionList) {
    return extensionList.filter(
      extension => filePath.toLowerCase().endsWith(extension.toLowerCase())
    ).length > 0;    
  },

  /**
  * Utility to return an object with properties sorted
  */
  sortProperties(obj, comparerKeyValue) {
    const res = {};
    let properties = [];
    for (let key in obj) {
      properties.push({key: key, value: obj[key]});
    }
    properties = properties.sort(comparerKeyValue);
    properties.forEach(prop => res[prop.key] = prop.value);
    return res;
  }
};