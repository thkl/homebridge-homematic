'use strict';
var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var FFMPEG = require('./ffmpeg').FFMPEG;

function HomeMaticHomeKitDoorBellVideoService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitDoorBellVideoService.super_.apply(this, arguments);

    // This all runs outside the normal Services
    this.setup();
}

util.inherits(HomeMaticHomeKitDoorBellVideoService, HomeKitGenericService);


HomeMaticHomeKitDoorBellVideoService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
  // Register new Characteristic or Services here
}



HomeMaticHomeKitDoorBellVideoService.prototype.createDeviceService = function(Service, Characteristic) {
}


HomeMaticHomeKitDoorBellVideoService.prototype.setup = function() {


	var that = this;
  this.delayOnSet = 500;
  var UUIDGen = this.platform.homebridge.hap.uuid;
  var Accessory = this.platform.homebridge.platformAccessory;
  var Service = this.platform.homebridge.hap.Service;
  var Characteristic = this.platform.homebridge.hap.Characteristic;
  var camera = this.getClazzConfigValue('camera',undefined)
  var adrKey = this.getClazzConfigValue('address_key_event',undefined)
  var adrunlockactor = this.getClazzConfigValue('address_unlock_actor',undefined)
  var cmdunlockactor = this.getClazzConfigValue('command_unlock_actor',1)

  this.lockState = 1;

  if (camera == undefined) {
    this.log.error("missing camera config");
    return
  }

  var videoConfig = camera.videoConfig;
  if (!videoConfig) {
      this.log.error("missing parameters in camera config");
      return;
  }

  var doorbell_accessory = new Accessory(this.name, UUIDGen.generate(this.name), this.platform.homebridge.hap.Accessory.Categories.VIDEO_DOORBELL);
  var doorbell_service = new Service.Doorbell(this.name);

  this.dingdongevent = doorbell_service.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    .on('get', function(callback) {
      callback(null,0)
    }.bind(this))


  var uuid = UUIDGen.generate(this.name);
  var cameraSource = new FFMPEG(this.platform.homebridge.hap, camera, this.log);
  doorbell_accessory.configureCameraSource(cameraSource);
  doorbell_accessory.addService(doorbell_service);
  doorbell_service.eventEnabled = true;

  // Register Key Event to trigger the bell
  if (adrKey != undefined) {
    this.log.debug("Register %s for Ring the bell events",adrKey)
    this.platform.registerAdressForEventProcessingAtAccessory(adrKey,this)
  }

  // if there is a actor for door opening add a lock mechanims
  if (adrunlockactor != undefined) {
    this.log.debug("Generate a lock mechanims for %s",adrunlockactor)

    var doorLock = new Service.LockMechanism(this.name + "_DoorLock")
    doorbell_accessory.addService(doorLock);

    var lock_current_state = doorLock.getCharacteristic(Characteristic.LockCurrentState)
    .on('get', function(callback) {
        callback(null,that.lockState);
    }.bind(this))

    lock_current_state.eventEnabled = true

    var target_state = doorLock.getCharacteristic(Characteristic.LockTargetState)

    .on('get', function(callback) {
        callback(null,that.lockState);
    }.bind(this))

    .on('set', function(value, callback) {
      that.log.debug('send unlock command')
      that.remoteSetDatapointValue(adrunlockactor,cmdunlockactor)
      callback()
    }.bind(this))
    target_state.eventEnabled = true
  }

  this.platform.api.publishCameraAccessories(this.name, [doorbell_accessory]);
}


HomeMaticHomeKitDoorBellVideoService.prototype.datapointEvent = function(dp,newValue){
  if (dp.indexOf('PRESS_SHORT')>-1) {
      this.log.debug("Palimm Palimm at %s", this.name);
      this.dingdongevent.setValue(0);
  }
}
module.exports = HomeMaticHomeKitDoorBellVideoService;
