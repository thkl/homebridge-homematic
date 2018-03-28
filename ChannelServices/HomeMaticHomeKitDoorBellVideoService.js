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
  this.adrKey = this.getClazzConfigValue('address_key_event',undefined)
  var adrunlockactor = this.getClazzConfigValue('address_unlock_actor',undefined)
  var cmdunlockactor = this.getClazzConfigValue('command_unlock_actor',{"on":true,"off":false})
  this.stdKey = this.getClazzConfigValue('state_key_event',undefined)
  var onTimeUnlock = this.getClazzConfigValue('ontime_unlock_actor',5)
  var pir = this.getClazzConfigValue('pir',undefined);
  this.doorMotion = false

  if (this.isDatapointAddressValid(this.adrKey,false)==false) {
    this.log.error('cannot initialize doorbell device adress for bell trigger is invalid')
    return
  }


  if (this.isDatapointAddressValid(adrunlockactor,true)==false) {
    this.log.error('cannot initialize doorbell device adress for unlock actor is invalid')
    return
  }
  // check ffmpeg command
  var spawn = require('child_process').spawn;
  try {
    let ffmpeg = spawn('ffmpeg', ['-h'], {env: process.env});
  } catch (e) {
    this.log.error(e)
    this.log.error('seems the ffmpeg command is not here')
    return
  }


  let unlockCommand = cmdunlockactor['on']
  let unlockResetCommand = cmdunlockactor['off']

  this.log.debug('Unlock Command is %s',unlockCommand)
  this.log.debug('Lock Command is %s',unlockResetCommand)

  this.lockState = Characteristic.LockCurrentState.SECURED;

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

  doorbell_accessory.on('identify', function(callback){
    that.log.debug('identify - send a dingdong')
    that.dingdongevent.setValue(0)
  }
  .bind(this))

  this.dingdongevent = doorbell_service.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    .on('get', function(callback) {
      callback(null,0)
    }.bind(this))


  var uuid = UUIDGen.generate(this.name);
  this.cameraSource = new FFMPEG(this.platform.homebridge.hap, camera, this.log);
  doorbell_accessory.configureCameraSource(this.cameraSource);
  doorbell_accessory.addService(doorbell_service);
  doorbell_service.eventEnabled = true;

  // Register Key Event to trigger the bell
  if (this.adrKey != undefined) {
    this.log.debug("Register %s for Ring the bell events",this.adrKey)
    this.platform.registerAdressForEventProcessingAtAccessory(this.adrKey,this)
  }

  // if there is a actor for door opening add a lock mechanims
  if (adrunlockactor != undefined) {
    this.log.debug("Adding a lock mechanims for %s",adrunlockactor)
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
      // Send Command to the actor (or run program)
      that.sendOpenDoorCommand(adrunlockactor,unlockCommand)
      // set HK Device to unlocked
      that.lockState = Characteristic.LockCurrentState.UNSECURED
      target_state.updateValue(that.lockState,null)
      lock_current_state.updateValue(that.lockState,null)
      // wait unlock time
      setTimeout(function(){
        // and reset all this 
        if (unlockResetCommand != undefined) {
          that.log.debug('send lock reset command %s',unlockResetCommand)
          that.sendOpenDoorCommand(adrunlockactor,unlockResetCommand)
        }
          that.lockState = Characteristic.LockCurrentState.SECURED
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

  // add optional pir
  if (pir != undefined) {
    this.piraddress = pir['address']
    if (this.piraddress != undefined) {
      this.log.debug("Adding pir motion sensor for %s",this.piraddress)
      // add Service
      var motionSensor = new Service.MotionSensor(this.name + "_MotionSensor");
      doorbell_accessory.addService(motionSensor);
      this.motionDetectedCharacteristic = motionSensor.getCharacteristic(Characteristic.MotionDetected)
      .on('get', function(callback) {
          callback(null,that.doorMotion);
      }.bind(this))
      // add Events
      this.platform.registerAdressForEventProcessingAtAccessory(this.piraddress,this)


    this.motionDetectorIsActiveCharacteristic = motionSensor.getCharacteristic(Characteristic.StatusActive)
    .on('get', function(callback) {
        this.log.info("DoorBell ask for Active Sensor")
        callback(null,1);
    }.bind(this))

    if (pir['upload']==true) {
      var drive = require('./google_drive').drive;
      this.drive = new drive();
    }
   }
  }

  // add AccessoryInformation



  doorbell_accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Name, this.name)
    .setCharacteristic(Characteristic.Manufacturer, 'https://github.com/thkl')
    .setCharacteristic(Characteristic.Model,'Homematic Video Doorbell')
    .setCharacteristic(Characteristic.SerialNumber, '42')
    .setCharacteristic(Characteristic.FirmwareRevision, this.platform.getVersion());

  // Set Lock State to locked at launch
if (adrunlockactor != undefined) {
  target_state.updateValue(Characteristic.LockCurrentState.SECURED,null)
  lock_current_state.updateValue(Characteristic.LockCurrentState.SECURED,null)

}
}

HomeMaticHomeKitDoorBellVideoService.prototype.sendOpenDoorCommand = function(adrunlockactor,command){
  let parts = adrunlockactor.split('.')
  // Check if it matches Foo.Bar.Bla
  if (parts.length != 3) {
      // no ? run as a Program name
      this.log.debug("Launch Program " + adrunlockactor);
      this.command("sendregacommand","","var x=dom.GetObject(\""+adrunlockactor+"\");if (x) {x.ProgramExecute();}",function() {
})
  } else {
      this.remoteSetDatapointValue(adrunlockactor,command)
  }
}

HomeMaticHomeKitDoorBellVideoService.prototype.channelDatapointEvent = function(channel,dp,newValue){

  this.log.debug("DoorBell Event %s.%s.%s %s",channel,dp,newValue, typeof newValue)

  let chdp = channel + "." + dp
  var that = this

  if (chdp == this.adrKey) {
    if (((this.stdKey != undefined) && (newValue == this.stdKey)) || (this.stdKey == undefined)) {
      this.log.debug("Palimm Palimm at %s", this.name);
      this.dingdongevent.setValue(0);
    }
  }

  if (this.piraddress != undefined) {
    if (chdp == this.piraddress) {
        this.doorMotion = newValue;
        this.motionDetectedCharacteristic.updateValue(newValue,null);

        if (this.piraddress.indexOf('PRESS_SHORT')>-1) {
          // reset if the trigger is a key
          setTimeout(function(){
              that.doorMotion = false;
              that.motionDetectedCharacteristic.updateValue(false,null);
          },1000);
        }

        if (newValue == true) {
          this.log.info("Motion is true request a Screenshot")
          this.cameraSource.handleSnapshotRequest({width:640,height:480},function(context,imagebuffer){
            that.log.info("Motion Done a SnapShot")
            // Save
            if (that.drive != undefined) {
              that.drive.storePicture(that.name,imagebuffer);
            }
          })
        }

    }
  } else {
    this.log.info("ignore motion there is no pir address");
  }

}


module.exports = HomeMaticHomeKitDoorBellVideoService;
