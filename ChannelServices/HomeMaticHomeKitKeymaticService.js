'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitKeymaticService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.requerytimer = undefined
    var door = this.getService(Service.LockMechanism)

    this.current_state = door.getCharacteristic(Characteristic.LockCurrentState)
      .on('get', function (callback) {
        self.remoteGetValue('STATE', function (result) {
          let hmState = ((result === 'true') || (result === true)) ? 0 : 1
          callback(null, hmState)
          let parts = self.address.split('.')
          self.event(parts[0] + '.' + parts[1], 'STATE', result)
        })
      })

    this.current_state.eventEnabled = true

    this.target_state = door.getCharacteristic(Characteristic.LockTargetState)

      .on('get', function (callback) {
        self.remoteGetValue('STATE', function (result) {
          let hmState = ((result === 'true') || (result === true)) ? 0 : 1
          callback(null, hmState)
          let parts = self.address.split('.')
          self.event(parts[0] + '.' + parts[1], 'STATE', result)
        })
      })

      .on('set', function (value, callback) {
        clearTimeout(self.requerytimer)
        self.command('setrega', 'STATE', (value === 1) ? 0 : 1)

        self.requerytimer = setTimeout(function () {
          self.queryState()
        }, 10000)
        callback()
      })

    var dopener = door.addCharacteristic(Characteristic.TargetDoorState)
      .on('get', function (callback) {
        if (callback) callback(null, 1)
      })

      .on('set', function (value, callback) {
        if (value === 0) {
          self.command('setrega', 'OPEN', 'true')
          setTimeout(function () {
            dopener.setValue(1, null)
          }, 2000)
        }
        let result = 0
        callback(result)
      })

    this.queryState()
  }

  queryState () {
    clearTimeout(this.requerytimer)
    let self = this
    this.remoteGetValue('STATE', function (result) {
      let parts = self.address.split('.')
      self.event(parts[0] + '.' + parts[1], 'STATE', result)
    })
  }

  datapointEvent (dp, newValue) {
    if (this.isDataPointEvent(dp, 'STATE')) {
      let hmState = ((newValue === 'true') || (newValue === true)) ? 0 : 1
      this.current_state.updateValue(hmState, null)
      this.target_state.updateValue(hmState, null)
    }
  }
}
module.exports = HomeMaticHomeKitKeymaticService
