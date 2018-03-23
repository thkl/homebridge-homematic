'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitBlindService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitBlindService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitBlindService, HomeKitGenericService);


HomeMaticHomeKitBlindService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  var blind = new Service.WindowCovering(this.name);
  this.delayOnSet = 750;
  this.observeInhibit = this.getClazzConfigValue('observeInhibit',false)

  this.inhibit = false;
  this.services.push(blind);

  this.currentPos = blind.getCharacteristic(Characteristic.CurrentPosition)

  .on('get', function(callback) {
    that.query("LEVEL",function(value){
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentPos.eventEnabled = true;

  this.targetPos = blind.getCharacteristic(Characteristic.TargetPosition)
  .on('get', function(callback) {
    that.query("LEVEL",function(value){
      if (callback) {
        callback(null,value);
      }
    })
  }.bind(this))

  .on('set', function(value, callback) {

    if ((that.inhibit == false) || (that.observeInhibit == false)) {
      that.delayed("set", "LEVEL", value, that.delayOnSet);
    } else {
      // wait one second to resync data
      that.log.debug('inhibit is true wait to resync')
      setTimeout(function(){
        that.queryData()
      },1000);
    }

    callback();
  }.bind(this));

  this.pstate = blind.getCharacteristic(Characteristic.PositionState)
  .on('get', function(callback) {
    that.query("DIRECTION",function(value){
      if (callback) {
        var result = 2;
        if (value!=undefined) {
          switch (value) {
            case 0:
            result = 2 // Characteristic.PositionState.STOPPED
            break
            case 1:
            result = 0 // Characteristic.PositionState.DECREASING
            break;
            case 2:
            result = 1 // Characteristic.PositionState.INCREASING
            break;
            case 3:
            result = 2 // Characteristic.PositionState.STOPPED
            break;
          }
          callback(null,result);
        } else {
          callback(null,"0");
        }
      }
    });
  }.bind(this));

  // only add if ObstructionDetected is used
  if (this.observeInhibit == true) {

    this.obstruction = blind.getCharacteristic(Characteristic.ObstructionDetected)
    .on('get', function(callback) {
      callback(null,that.inhibit)
    }.bind(this))
    this.obstruction.eventEnabled = true;
    this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".INHIBIT",this)

  }

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".DIRECTION",this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".LEVEL",this)
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(":"));
  this.queryData();
}

HomeMaticHomeKitBlindService.prototype.queryData = function(newValue)  {
  let that = this;
  this.remoteGetValue("LEVEL",function(newValue){
    that.datapointEvent('1:LEVEL',newValue)
  });

  this.remoteGetValue("LEVEL",function(newValue){
    that.datapointEvent('1:LEVEL',newValue)
  });

  if (this.observeInhibit == true) {
    this.remoteGetValue("INHIBIT",function(newValue){
      that.datapointEvent('1:INHIBIT',newValue)
    });
  }

}

HomeMaticHomeKitBlindService.prototype.endWorking=function()  {
  let that = this
  this.remoteGetValue("LEVEL",function(value) {
    that.currentPos.updateValue(value,null);
    that.targetPos.updateValue(value,null);
  })
}



HomeMaticHomeKitBlindService.prototype.datapointEvent = function(dp,newValue)  {
  let that = this

  if ((dp == "1:INHIBIT") && (this.observeInhibit == true)) {
    this.inhibit = newValue
    this.obstruction.updateValue(newValue,null);
  }

  if (dp == "1:DIRECTION") {
    switch (newValue) {
      case 0:
      this.pstate.updateValue(2,null);
      break;
      case 1:
      this.pstate.updateValue(0,null);
      break;
      case 2:
      this.pstate.updateValue(1,null);
      break;
      case 3:
      this.pstate.updateValue(2,null);
      break;
    }
  }

  if (dp == "1:WORKING_SLATS") {
    if (newValue == false) {
      this.remoteGetValue("LEVEL",function(value) {
        that.currentPos.updateValue(value,null);
        that.targetPos.updateValue(value,null);
      })
    }
  }

  if (dp == "1:LEVEL") {
    that.currentPos.updateValue(newValue,null);
    that.targetPos.updateValue(newValue,null);
  }
}

module.exports = HomeMaticHomeKitBlindService;
