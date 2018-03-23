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
  var cmdunlockactor = this.getClazzConfigValue('command_unlock_actor',{"on":true,"off":false})
  this.stdKey = this.getClazzConfigValue('state_key_event',undefined)
  var onTimeUnlock = this.getClazzConfigValue('ontime_unlock_actor',5)

  if (this.isDatapointAddressValid(adrKey,false)==false) {
    this.log.error('cannot initialize doorbell device adress for bell trigger is invalid')
    return
  }


  if (this.isDatapointAddressValid(adrunlockactor,true)==false) {
    this.log.error('cannot initialize doorbell device adress for unlock actor is invalid')
    return
  }

  let unlockCommand = cmdunlockactor['on']
  let unlockResetCommand = cmdunlockactor['off']

  this.log.debug('Unlock Command is %s',unlockCommand)
  this.log.debug('Lock Command is %s',unlockResetCommand)

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
    // parse and get dp
    let parts = adrKey.split('.')
    this.ringDingDp = parts[2]
    this.log.debug("Datapoint for Ringelingedingdong is %s",this.ringDingDp)
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
      that.log.debug('send unlock command %s',unlockCommand)
      that.remoteSetDatapointValue(adrunlockactor,unlockCommand)
      that.lockState = 0
      target_state.updateValue(that.lockState,null)
      lock_current_state.updateValue(that.lockState,null)
      setTimeout(function(){
        if (unlockResetCommand != undefined) {
          that.log.debug('send lock reset command %s',unlockResetCommand)
          that.remoteSetDatapointValue(adrunlockactor,unlockResetCommand)
        }
          that.lockState = 1
          target_state.updateValue(that.lockState,null)
          lock_current_state.updateValue(that.lockState,null)
        },1000 * onTimeUnlock)

      callback()
    }.bind(this))
    target_state.eventEnabled = true
  } else {
    this.log.warn('No address found for a lock. So there will be ne Unlock Door Button')
  }

  this.platform.api.publishCameraAccessories(this.name, [doorbell_accessory]);
}


HomeMaticHomeKitDoorBellVideoService.prototype.datapointEvent = function(dp,newValue){
  if (dp.indexOf(this.ringDingDp)>-1) {
    if (((this.stdKey != undefined) && (newValue == this.stdKey)) || (this.stdKey == undefined)) {
      this.log.debug("Palimm Palimm at %s", this.name);
      this.dingdongevent.setValue(0);
    }
  }
}
module.exports = HomeMaticHomeKitDoorBellVideoService;
