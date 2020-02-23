'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const util = require('util')

class HomeMaticHomeKitDoorService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    Service.DoorStateService = function (displayName, subtype) {
      Service.call(this, displayName, '5243F2EA-006C-4D68-83A0-4AF6F606136C', subtype)
      this.addCharacteristic(Characteristic.CurrentDoorState)
      this.addOptionalCharacteristic(Characteristic.Name)
    }

    util.inherits(Service.DoorStateService, Service)
  }

  createDeviceService (Service, Characteristic) {
    var that = this
    var reverse = false
    if (this.cfg !== undefined) {
      if (this.cfg['reverse'] !== undefined) {
        reverse = true
      }
    }

    var door = this.getService(Service.Door)

    var cdoor = door.getCharacteristic(Characteristic.CurrentPosition)
    cdoor.on('get', function (callback) {
      that.query('STATE', function (value) {
        if (callback) {
          var cbvalue = 0
          if (value > 0) { cbvalue = 100 }
          callback(null, cbvalue)
        }
      })
    })

    this.currentStateCharacteristic['STATE'] = cdoor
    cdoor.eventEnabled = true

    if (reverse === true) {
      this.addValueMapping('STATE', 1, 1)
      this.addValueMapping('STATE', 0, 100)
      this.addValueMapping('STATE', true, 1)
      this.addValueMapping('STATE', false, 100)
    } else {
      this.addValueMapping('STATE', 0, 1)
      this.addValueMapping('STATE', 1, 100)
      this.addValueMapping('STATE', false, 0)
      this.addValueMapping('STATE', true, 100)
    }

    var sdoor = door.getCharacteristic(Characteristic.PositionState)
    sdoor.on('get', function (callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED)
    })

    var odoor = door.getCharacteristic(Characteristic.ObstructionDetected)
    odoor.on('get', function (callback) {
      if (callback) callback(null, 1)
    })

    this.remoteGetValue('STATE')
  }
}

module.exports = HomeMaticHomeKitDoorService
