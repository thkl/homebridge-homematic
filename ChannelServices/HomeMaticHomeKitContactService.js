'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var EveHomeKitTypes = require('./EveHomeKitTypes.js');

const moment = require('moment');
const epoch = moment('2001-01-01T00:00:00Z').unix()
let eve

function HomeMaticHomeKitContactService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitContactService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitContactService, HomeKitGenericService);


HomeMaticHomeKitContactService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}

HomeMaticHomeKitContactService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.enableLoggingService("door",false);

  this.timesOpened = this.getPersistentState("timesOpened",0)
  this.timeOpen = this.getPersistentState("timeOpen",0)
  this.timeClosed = this.getPersistentState("timeClosed",0)
  this.timeStamp = moment().unix()

  this.lastReset = this.getPersistentState("lastReset",undefined)
  if (this.lastReset == undefined) {
    // Set to now
    this.lastReset = moment().unix()-epoch
    this.setPersistentState("lastReset",this.lastReset)
  }

  this.lastOpen = this.getPersistentState("lastOpen",undefined)
  if ((this.lastOpen == undefined) && (this.loggingService!=undefined)) {
    // Set to now
    this.lastOpen = moment().unix()-this.loggingService.getInitialTime();
    this.setPersistentState("lastOpen",this.lastOpen)
    this.log.debug("No LastOpen - set it to just now")
  }

  var reverse = false;
  if (this.cfg != undefined) {
    if (this.cfg["reverse"]!=undefined) {
      reverse = true;
    }
  }

  if (this.special=="WINDOW") {

    var window = new Service.Window(this.name);
    var cwindow = window.getCharacteristic(Characteristic.CurrentPosition);
    cwindow.on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) {
          var cbvalue = 0;
          if (value>0) {cbvalue = 100;}
          callback(null,cbvalue);
        }
      });
    }.bind(this));

    this.currentStateCharacteristic["STATE"] = cwindow;
    cwindow.eventEnabled = true;


    var twindow = window.getCharacteristic(Characteristic.TargetPosition);
    twindow.on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) {
          var cbvalue = 0;
          if (value>0) {cbvalue = 100;}
          callback(null,cbvalue);
        }
      });
    }.bind(this));

    this.targetCharacteristic = twindow;

    this.addValueMapping("STATE",0,0);
    this.addValueMapping("STATE",1,100);
    this.addValueMapping("STATE",false,0);
    this.addValueMapping("STATE",true,100);

    var swindow = window.getCharacteristic(Characteristic.PositionState);
    swindow.on('get', function(callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED);
    }.bind(this));

    this.services.push(window);

  } else

  if (this.special=="DOOR") {
    var door = new Service.Door(this.name);
    this.cdoor = door.getCharacteristic(Characteristic.CurrentPosition);
    this.cdoor.on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) callback(null,(value==true) ? 0:100);
      });
    }.bind(this));
    this.cdoor.eventEnabled = true;

    this.tdoor = door.getCharacteristic(Characteristic.TargetPosition);
    this.tdoor.on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) callback(null,(value==true) ? 0:100);
      });
    }.bind(this))

    .on('set',  function(value,callback) {
      // This is just a sensor so reset homekit data to ccu value after 1 second playtime
      setTimeout(function () {
        that.remoteGetValue("STATE",function(value){
          that.processDoorState(value)
        })
      }, 1000)

      if (callback) {
        callback()
      }
    }.bind(this))

    this.sdoor = door.getCharacteristic(Characteristic.PositionState);
    this.sdoor.on('get', function(callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED);
    }.bind(this));

    this.services.push(door);
    this.remoteGetValue("STATE",function(value){
      that.processDoorState(value)
    });
  } else {
    this.log.debug("Creating a ContactSensor")
    this.contact = new Service.ContactSensor(this.name);
    this.contact.addOptionalCharacteristic(eve.Characteristic.TimesOpened)
    this.contact.addOptionalCharacteristic(eve.Characteristic.OpenDuration)
    this.contact.addOptionalCharacteristic(eve.Characteristic.ClosedDuration)
    this.contact.addOptionalCharacteristic(eve.Characteristic.LastActivation)
    this.addLoggingCharacteristic(eve.Characteristic.ResetTotal)

    var rt = this.getLoggingCharacteristic(eve.Characteristic.ResetTotal)
    if (rt != undefined) {
    rt.on('set',  function(value,callback) {

        // only reset if its not equal the reset time we know
        if (value != that.lastReset) {
          that.log.debug("set ResetTotal called %s != last reset so do a reset",value)
          that.timesOpened = 0
          that.lastReset = value;
          that.setPersistentState("timesOpened",that.timesOpened)
          this.setPersistentState("lastReset",that.lastReset)

          if (that.CharacteristicTimesOpened) {
            that.CharacteristicTimesOpened.updateValue(that.timesOpened,null)
          }
        } else {
          that.log.debug("set ResetTotal called %s its equal the last reset time so ignore",value)
        }
        if (callback) {
          callback()
        }
      }.bind(this))

      .on('get', function(callback) {
        that.log.debug("get ResetTotal called %s",that.lastReset)
        callback(null,that.lastReset)
      }.bind(this))

      rt.setValue(this.lastReset)
    }


    this.contact.getCharacteristic(Characteristic.StatusActive)
    .on('get',function(callback){
      callback(null,true)
    }.bind(this))
    this.contact.getCharacteristic(Characteristic.StatusActive).setValue(true)

    this.CharacteristicOpenDuration = this.contact.getCharacteristic(eve.Characteristic.OpenDuration)
    .on('get',function(callback){
      that.log.debug("getOpenDuration")
      callback(null,that.timeOpen)
    }.bind(this));
    this.CharacteristicOpenDuration.setValue(0);

    this.CharacteristicClosedDuration = this.contact.getCharacteristic(eve.Characteristic.ClosedDuration)
    .on('get',function(callback){
      that.log.debug("getClosedDuration")
      callback(null,that.timeClosed)
    }.bind(this));
    this.CharacteristicClosedDuration.setValue(0);


  this.CharacteristicLastOpen = this.contact.getCharacteristic(eve.Characteristic.LastActivation)
  .on('get',function(callback){
      that.log.debug("getLastOpen will report %s",that.lastOpen)
      callback(null,that.lastOpen)
    }.bind(this));
  this.CharacteristicLastOpen.setValue(this.lastOpen)


    this.CharacteristicTimesOpened = this.contact.getCharacteristic(eve.Characteristic.TimesOpened)
    .on('get',function(callback){
      that.log.debug("getTimesOpened will report %s",that.timesOpened)
      callback(null,that.timesOpened)
    })
    this.CharacteristicTimesOpened.setValue(this.timesOpened);


    this.contactstate = this.contact.getCharacteristic(Characteristic.ContactSensorState)
    .on('get', function(callback) {
      that.query("STATE",function(value){
        if (reverse == true) {
          that.log("Reverse from " + value);
        }
        callback(null,value);
      });
    }.bind(this));

    this.contactstate.eventEnabled = true;

    if (reverse == true ) {
      this.addValueMapping("STATE",1,0);
      this.addValueMapping("STATE",0,100);
      this.addValueMapping("STATE",true,0);
      this.addValueMapping("STATE",false,100);
    } else {
      this.addValueMapping("STATE",true,1);
      this.addValueMapping("STATE",false,0);
    }

    this.services.push(this.contact);
  }
  this.remoteGetValue("STATE",function(value){
    if ( that.special == "DOOR" ) {
      that.processDoorState(value)
    } else {
      that.processContactState(value)
    }
  });
}

HomeMaticHomeKitContactService.prototype.stateCharacteristicDidChange = function(characteristic,newValue) {
  if (characteristic.displayName=="Current Position") {
    // Set Target
    if (this.targetCharacteristic) {
      this.targetCharacteristic.setValue(newValue, null);
    }
  }
}

HomeMaticHomeKitContactService.prototype.processContactState = function(newValue) {
 if (  this.contactstate != undefined) {
   this.contactstate.updateValue(newValue,null)
 }
}

HomeMaticHomeKitContactService.prototype.processDoorState = function(newValue) {
  if (this.haz([this.cdoor,this.tdoor,this.sdoor])) {
    switch (newValue) {
      case true :
      this.cdoor.updateValue(0,null)
      this.tdoor.updateValue(0,null)
      this.sdoor.updateValue(2,null)
      break;
      case false:
      this.cdoor.updateValue(100,null)
      this.tdoor.updateValue(100,null)
      this.sdoor.updateValue(2,null)
      break;
    }
  }
}

HomeMaticHomeKitContactService.prototype.datapointEvent= function(dp,newValue,channel) {
  if (this.isDataPointEvent(dp,'STATE')) {

    this.addLogEntry({status:(newValue==true)?1:0});
    if ( this.special == "DOOR" ) {
      this.processDoorState(newValue)
    } else {
      this.processContactState(newValue)
    }

    let now = moment().unix()
    if (newValue == true) {
      this.timeClosed = this.timeClosed + (moment().unix() - this.timeStamp)
      this.timesOpened = this.timesOpened + 1;
      if (this.loggingService!=undefined) {
        let firstLog = this.loggingService.getInitialTime();
        this.lastOpen = moment().unix() - firstLog;
        this.CharacteristicLastOpen.updateValue(this.lastOpen,null)
        this.setPersistentState("lastOpen",this.lastOpen)
      }
      this.CharacteristicTimesOpened.updateValue(this.timesOpened,null)
      this.setPersistentState("timesOpened",this.timesOpened)
    } else {
      this.timeOpen = this.timeOpen + (moment().unix() - this.timeStamp)
    }
    this.timeStamp = now
  }
}

module.exports = HomeMaticHomeKitContactService;
