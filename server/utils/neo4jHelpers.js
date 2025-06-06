function convertNeo4jIntegers(obj) {
    if (Array.isArray(obj)) {
      return obj.map(convertNeo4jIntegers);
    }
    if (obj && typeof obj === 'object') {
      const res = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
          res[key] = value.toNumber();
        } else if (Array.isArray(value)) {
          res[key] = value.map(convertNeo4jIntegers);
        } else if (value && typeof value === 'object') {
          res[key] = convertNeo4jIntegers(value);
        } else {
          res[key] = value;
        }
      }
      return res;
    }
    return obj;
  }
  
  module.exports = { convertNeo4jIntegers };