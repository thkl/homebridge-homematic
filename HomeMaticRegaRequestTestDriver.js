var http = require("http");


function HomeMaticRegaRequestTestDriver(log, ccuip) {
  this.log = log;
  this.ccuIP = ccuip;
  this.timeout = 120;
  this.data = 0;
  this.log.warn('Dummy Class for Tests only')
}

HomeMaticRegaRequestTestDriver.prototype = {

  script: function(script, callback) {
    callback(this.data)
  },

  getValue: function(channel, datapoint, callback) {
    this.log.warn('getback %s',this.data)
    callback(this.data);
  },

  setValue: function(channel, datapoint, value) {
  },

  setVariable: function(channel, value) {
  },


  getVariable: function(channel, callback) {
    this.log.warn('getback %s',this.data)
    callback(this.data);
  },

  isInt: function(n){
    return Number(n) === n && n % 1 === 0;
  },

  isFloat: function(n){
    return n === Number(n) && n % 1 !== 0;
  }

};

module.exports = {
  HomeMaticRegaRequestTestDriver: HomeMaticRegaRequestTestDriver
}
