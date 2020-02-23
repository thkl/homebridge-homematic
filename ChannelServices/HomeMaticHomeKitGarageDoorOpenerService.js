'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitGarageDoorOpenerService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) { }

  createDeviceService (Service, Characteristic) {
    let self = this
    this.characteristic = Characteristic

    var garagedoorService = this.getService(Service.GarageDoorOpener)

    this.obstacle = garagedoorService.getCharacteristic(Characteristic.ObstructionDetected)
      .on('get', function (callback) {
        if (callback) callback(null, false)
      })

    this.currentDoorState = garagedoorService.getCharacteristic(Characteristic.CurrentDoorState)

      .on('get', function (callback) {
        self.log.debug('[GOS]  homekit state request')

        self.query('DOOR_STATE', function (value) {
          switch (value) {
            case 0:
              self.log.debug('[GOS]  ccu says door is closed')
              if (callback) callback(null, Characteristic.CurrentDoorState.CLOSED)
              break
            case 1:
            case 2:
            case 3:
              self.log.debug('[GOS]  ccu says door is open')
              if (callback) callback(null, Characteristic.CurrentDoorState.OPEN)
              break

            default:
              break
          }
        })
      })

    this.targetDoorState = garagedoorService.getCharacteristic(Characteristic.TargetDoorState)
      .on('set', function (value, callback) {
        self.log.debug('[GOS]  Homekit Door Command %s', value)

        switch (value) {
          case Characteristic.TargetDoorState.OPEN:
            self.log.debug('[GOS]  sent 1 to ccu ')
            self.delayed('set', 'DOOR_COMMAND', 1)
            break
          case Characteristic.TargetDoorState.CLOSED:
            self.log.debug('[GOS]  sent 3 to ccu ')
            self.delayed('set', 'DOOR_COMMAND', 3)
            break

          default:
            break
        }
      })

    this.currentDoorState.eventEnabled = true
    this.targetDoorState.eventEnabled = true
    this.queryData()
  }

  queryData () {
    let self = this
    self.remoteGetValue('DOOR_STATE', function (value) {
      self.log.debug('[GOS] remoteGetValue %s', value)
      self.datapointEvent(self.channelnumber + '.DOOR_STATE', value)
    })
  }

  datapointEvent (dp, newValue) {
    this.log.debug('[GOS] ccu datapoint event %s', newValue)

    if (this.isDataPointEvent(this.channelnumber + '.DOOR_STATE', dp)) {
      this.log.debug('[GOS] ccu datapoint event %s', newValue)

      switch (newValue) {
        case 0:
          this.log.debug('[GOS] sent Closed to Homekit')
          this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.CLOSED, null)
          this.targetDoorState.updateValue(this.characteristic.TargetDoorState.CLOSED, null)
          break
        case 1:
        case 2:
        case 3:
          this.log.debug('[GOS] sent open to Homekit')
          this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.OPEN, null)
          this.targetDoorState.updateValue(this.characteristic.TargetDoorState.OPEN, null)
          break

        default:
          break
      }
    }
  }
}
module.exports = HomeMaticHomeKitGarageDoorOpenerService
