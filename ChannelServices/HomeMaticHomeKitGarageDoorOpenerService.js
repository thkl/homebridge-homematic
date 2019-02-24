
'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitGarageDoorOpenerService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitGarageDoorOpenerService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitGarageDoorOpenerService, HomeKitGenericService)

HomeMaticHomeKitGarageDoorOpenerService.prototype.propagateServices = function (homebridge, Service, Characteristic) {
}

HomeMaticHomeKitGarageDoorOpenerService.prototype.createDeviceService = function (Service, Characteristic) {
  let that = this
  this.characteristic = Characteristic

  var garagedoorService = new Service.GarageDoorOpener(this.name)
  this.services.push(garagedoorService)

  this.obstacle = garagedoorService.getCharacteristic(Characteristic.ObstructionDetected)
    .on('get', function (callback) {
      if (callback) callback(null, false)
    })

  this.currentDoorState = garagedoorService.getCharacteristic(Characteristic.CurrentDoorState)

    .on('get', function (callback) {
      that.log.debug('HmIP-MOD-TM homekit state request')

      that.query('DOOR_STATE', function (value) {
        switch (value) {
          case 0:
            that.log.debug('HmIP-MOD-TM ccu says door is closed')
            if (callback) callback(null, Characteristic.CurrentDoorState.CLOSED)
            break
          case 1:
          case 2:
          case 3:
            that.log.debug('HmIP-MOD-TM ccu says door is open')
            if (callback) callback(null, Characteristic.CurrentDoorState.OPEN)
            break

          default:
            break
        }
      })
    })

  this.targetDoorState = garagedoorService.getCharacteristic(Characteristic.TargetDoorState)
    .on('set', function (value, callback) {
      that.log.debug('HmIP-MOD-TM Homekit Door Command %s', value)

      switch (value) {
        case Characteristic.TargetDoorState.OPEN:
          that.log.debug('HmIP-MOD-TM sent 1 to ccu ')
          that.delayed('set', 'DOOR_COMMAND', 1)
          break
        case Characteristic.TargetDoorState.CLOSED:
          that.log.debug('HmIP-MOD-TM sent 3 to ccu ')
          that.delayed('set', 'DOOR_COMMAND', 3)
          break

        default:
          break
      }
    })

  this.currentDoorState.eventEnabled = true
  this.targetDoorState.eventEnabled = true
}

HomeMaticHomeKitGarageDoorOpenerService.prototype.datapointEvent = function (dp, newValue) {
  if (dp === this.channelnumber + ':DOOR_STATE') {
    this.log.debug('HmIP-MOD-TM ccu datapoint event %s', newValue)

    switch (newValue) {
      case 0:
        this.log.debug('HmIP-MOD-TM sent Closed to Homekit')
        this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.CLOSED, null)
        this.targetDoorState.updateValue(this.characteristic.TargetDoorState.CLOSED, null)
        break
      case 1:
      case 2:
      case 3:
        this.log.debug('HmIP-MOD-TM sent open to Homekit')
        this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.OPEN, null)
        this.targetDoorState.updateValue(this.characteristic.TargetDoorState.OPEN, null)
        break

      default:
        break
    }
  }
}

module.exports = HomeMaticHomeKitGarageDoorOpenerService
