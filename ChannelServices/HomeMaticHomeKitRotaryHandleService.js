'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitRotaryHandleService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitRotaryHandleService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitRotaryHandleService, HomeKitGenericService);



HomeMaticHomeKitRotaryHandleService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  if (this.special=="WINDOW") {
    var window = new Service.Window(this.name);
    this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition);
    this.cwindow.on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) {
          switch (value) {
            case 0:
            callback(null,0)
            break;
            case 1:
            callback(null,50)
            break
            case 2:
            callback(null,100)
            break
            default:
            callback(null,0)

          }
        }
      });
    }.bind(this));


    this.cwindow.eventEnabled = true;

    this.twindow = window.getCharacteristic(Characteristic.TargetPosition);
    this.twindow.on('set',  function(value,callback) {
      // This is just a sensor so reset homekit data to ccu value after 1 second playtime
      setTimeout(function () {
        that.remoteGetValue("STATE",function(value){
          that.processWindowSensorData(value)
        })
      }, 1000)

      if (callback) {
        callback()
      }
    }.bind(this))

    .on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) {
          switch (value) {
            case 0:
            callback(null,0)
            break;
            case 1:
            callback(null,50)
            break
            case 2:
            callback(null,100)
            break
            default:
            callback(null,0)
          }
        }
      });
    }.bind(this));

    this.swindow = window.getCharacteristic(Characteristic.PositionState);
    this.swindow.on('get', function(callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED);
    }.bind(this));

    this.services.push(window);

  } else


  if (this.special=="DOOR") {
    var door = new Service["Door"](this.name);
    this.cdoor = door.getCharacteristic(Characteristic.CurrentPosition);
    this.cdoor.on('get', function(callback) {
      that.query("STATE",function(value){
        if (callback) {
          switch (value) {
            case 0:
            callback(null,0)
            break;
            case 1:
            callback(null,50)
            break
            case 2:
            callback(null,100)
            break
            default:
            callback(null,0)
          }
        }
      });
    }.bind(this));

    this.cdoor.eventEnabled = true;
    this.services.push(door);

  } else {

    var contact = new Service.ContactSensor(this.name);
    this.ccontact = contact.getCharacteristic(Characteristic.ContactSensorState)
    .on('get', function(callback) {
      that.query("STATE",function(value) {
        if (callback) {
          switch (value) {
            case 0:
            callback(null,0)
            break;
            case 1:
            callback(null,1)
            break
            case 2:
            callback(null,1)
            break
            default:
            callback(null,0)
          }
        }
      });
    }.bind(this));

    this.ccontact.eventEnabled = true;
    this.addTamperedCharacteristic(contact,Characteristic);
    this.addLowBatCharacteristic(contact,Characteristic);
    this.services.push(contact);
  }

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ":1.STATE",this)
  this.remoteGetValue('STATE',function(newValue){
    that.processWindowSensorData(newValue)
  })

}

HomeMaticHomeKitRotaryHandleService.prototype.processWindowSensorData = function(newValue){

  if (this.special == "WINDOW") {
    if (this.haz([this.cwindow,this.swindow,this.twindow])) {
      switch (newValue) {
        case 0 :
        this.cwindow.updateValue(0,null)
        this.swindow.updateValue(2,null)
        this.twindow.updateValue(0,null)
        break;
        case 1:
        this.cwindow.updateValue(50,null)
        this.swindow.updateValue(2,null)
        this.twindow.updateValue(50,null)
        break;
        case 2:
        this.cwindow.updateValue(100,null)
        this.swindow.updateValue(2,null)
        this.twindow.updateValue(100,null)
        break;
      }
    }
  } else

  if (this.special == "DOOR") {
    if (this.haz([this.cdoor])) {
      switch (newValue) {
        case 0 :
        this.cdoor.updateValue(0,null)
        break;
        case 1:
        this.cdoor.updateValue(50,null)
        break;
        case 2:
        this.cdoor.updateValue(100,null)
        break;
      }
    }
  }
  else {
    if (this.haz([this.ccontact])) {
      switch (newValue) {
        case 0 :
        this.ccontact.updateValue(0,null)
        break;
        case 1:
        this.ccontact.updateValue(1,null)
        break;
        case 2:
        this.ccontact.updateValue(1,null)
        break;
      }
    }
  }
}

HomeMaticHomeKitRotaryHandleService.prototype.event = function(channel,dp,newValue){
  // Chech sensors
  let that = this
  let event_address = channel + '.' + dp
  this.processWindowSensorData(newValue)
}


module.exports = HomeMaticHomeKitRotaryHandleService;
