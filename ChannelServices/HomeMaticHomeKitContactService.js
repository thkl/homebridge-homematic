'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
const moment = require('moment');
const epoch = moment('2001-01-01T00:00:00Z').unix()

function HomeMaticHomeKitContactService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitContactService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitContactService, HomeKitGenericService);


HomeMaticHomeKitContactService.prototype.propagateServices = function(homebridge, Service, Characteristic) {

}

HomeMaticHomeKitContactService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.enableLoggingService("door");

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
  if (this.lastOpen == undefined) {
    // Set to now
    this.lastOpen = moment().unix()
    this.setPersistentState("lastOpen",this.lastOpen)
    this.log.debug("No LastOpen - set it to just now")
  }


  this.log.info("Adding additional characteristics")

  Characteristic.OpenDuration = function() {
    Characteristic.call(this, 'Open Duration', 'E863F118-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };

  util.inherits(Characteristic.OpenDuration, Characteristic);
  Characteristic.OpenDuration.UUID = 'E863F118-079E-48FF-8F27-9C2605A29F52'

  Characteristic.ClosedDuration = function() {
    Characteristic.call(this, 'Closed Duration', 'E863F119-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };

  util.inherits(Characteristic.ClosedDuration, Characteristic);
  Characteristic.ClosedDuration.UUID = 'E863F119-079E-48FF-8F27-9C2605A29F52'


  Characteristic.ResetTotal = function() {
    Characteristic.call(this, 'Reset Total', 'E863F112-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };
  util.inherits(Characteristic.ResetTotal, Characteristic);
  Characteristic.ResetTotal.UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52'

  Characteristic.TimesOpened = function() {
    Characteristic.call(this, 'Times Opened', 'E863F129-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };

  util.inherits(Characteristic.TimesOpened, Characteristic);
  Characteristic.TimesOpened.UUID = 'E863F129-079E-48FF-8F27-9C2605A29F52'

  Characteristic.LastOpen = function() {
    Characteristic.call(this, 'Last Activation', 'E863F11A-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  }
  util.inherits(Characteristic.LastOpen, Characteristic);
  Characteristic.LastOpen.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52'




  //

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
    this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".STATE",this)
    this.remoteGetValue("STATE",function(value){
      that.processDoorState(value)
    });
  } else {
    this.log.debug("Creating a ContactSensor")
    this.contact = new Service.ContactSensor(this.name);

    this.contact.addOptionalCharacteristic(Characteristic.TimesOpened)
    this.contact.addOptionalCharacteristic(Characteristic.OpenDuration)
    this.contact.addOptionalCharacteristic(Characteristic.ClosedDuration)
    this.contact.addOptionalCharacteristic(Characteristic.LastOpen)
    this.loggingService.addOptionalCharacteristic(Characteristic.ResetTotal)

    var rt = this.loggingService.getCharacteristic(Characteristic.ResetTotal)
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

    this.CharacteristicOpenDuration = this.contact.getCharacteristic(Characteristic.OpenDuration)
    .on('get',function(callback){
      that.log.debug("getOpenDuration")
      callback(null,that.timeOpen)
    }.bind(this));
    this.CharacteristicOpenDuration.setValue(0);

    this.CharacteristicClosedDuration = this.contact.getCharacteristic(Characteristic.ClosedDuration)
    .on('get',function(callback){
      that.log.debug("getClosedDuration")
      callback(null,that.timeClosed)
    }.bind(this));
    this.CharacteristicClosedDuration.setValue(0);


    this.CharacteristicLastOpen = this.contact.getCharacteristic(Characteristic.LastOpen)
    .on('get',function(callback){
      that.log.debug("getLastOpen will report %s",that.lastOpen)
      callback(null,that.lastOpen)
    }.bind(this));
    this.CharacteristicLastOpen.setValue(this.lastOpen)


    this.CharacteristicTimesOpened = this.contact.getCharacteristic(Characteristic.TimesOpened)
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


    // this.addTamperedCharacteristic(this.contact,Characteristic,"0.SABOTAGE");
    // this.addLowBatCharacteristic(this.contact,Characteristic);
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
  this.contactstate.updateValue(newValue,null)
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

HomeMaticHomeKitContactService.prototype.datapointEvent= function(dp,newValue) {
  this.log.debug("%s %s",dp,newValue)
  if (dp == this.channelnumber + ':STATE') {
    this.log.info("Add Log %s %s",dp,newValue)
    this.addLogEntry({status:(newValue==true)?1:0});
    if ( this.special == "DOOR" ) {
      this.processDoorState(newValue)
    } else {
      this.processContactState(newValue)
    }
    let now = moment().unix()

    if (newValue == true) {

      this.lastOpen = (moment().unix()-epoch);
      this.log.info("Last Reset %s Now %s LastAction %s",moment().unix(),this.lastReset,this.lastOpen)
      this.timeClosed = this.timeClosed + (moment().unix() - this.timeStamp)
      this.timesOpened = this.timesOpened + 1;
      this.CharacteristicTimesOpened.updateValue(this.timesOpened,null)
      this.setPersistentState("timesOpened",this.timesOpened)
      this.setPersistentState("lastOpen",this.lastOpen)
      this.CharacteristicLastOpen.updateValue(this.lastOpen,null)
      
      //this.CharacteristicOpenDuration.updateValue(now-this.lastReset,null)
      
    } else {
      this.timeOpen = this.timeOpen + (moment().unix() - this.timeStamp)
      
      //this.CharacteristicClosedDuration.updateValue(now-this.lastReset,null)
      
      
    }
    
    
    
    this.setPersistentState("timeOpen",this.timeOpen)
    this.setPersistentState("timeClosed",this.timeClosed)
    //this.CharacteristicOpenDuration.updateValue(this.timeOpen,null)
    //this.CharacteristicClosedDuration.updateValue(this.timeClosed,null)
  }
}

module.exports = HomeMaticHomeKitContactService;
