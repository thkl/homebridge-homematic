'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitKeymaticService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitKeymaticService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitKeymaticService, HomeKitGenericService)

HomeMaticHomeKitKeymaticService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.requerytimer = undefined
  var door = new Service.LockMechanism(this.name)
  this.services.push(door)

  this.current_state = door.getCharacteristic(Characteristic.LockCurrentState)
    .on('get', function (callback) {
      that.remoteGetValue('STATE', function (result) {
        let hmState = ((result === 'true') || (result === true)) ? 0 : 1
        callback(null, hmState)
        let parts = that.adress.split('.')
        that.event(parts[0] + '.' + parts[1], 'STATE', result)
      })
    })

  this.current_state.eventEnabled = true

  this.target_state = door.getCharacteristic(Characteristic.LockTargetState)

    .on('get', function (callback) {
      that.remoteGetValue('STATE', function (result) {
        let hmState = ((result === 'true') || (result === true)) ? 0 : 1
        callback(null, hmState)
        let parts = that.adress.split('.')
        that.event(parts[0] + '.' + parts[1], 'STATE', result)
      })
    })

    .on('set', function (value, callback) {
      clearTimeout(that.requerytimer)
      that.command('setrega', 'STATE', (value === 1) ? 0 : 1)

      that.requerytimer = setTimeout(function () {
        that.queryState()
      }, 10000)
      callback()
    })

  var dopener = door.addCharacteristic(Characteristic.TargetDoorState)
    .on('get', function (callback) {
      if (callback) callback(null, 1)
    })

    .on('set', function (value, callback) {
      if (value === 0) {
        that.command('setrega', 'OPEN', 'true')
        setTimeout(function () {
          dopener.setValue(1, null)
        }, 2000)
      }
      let result = 0
      callback(result)
    })

  this.queryState()
}

HomeMaticHomeKitKeymaticService.prototype.queryState = function () {
  clearTimeout(this.requerytimer)
  let that = this
  this.remoteGetValue('STATE', function (result) {
    let parts = that.adress.split('.')
    that.event(parts[0] + '.' + parts[1], 'STATE', result)
  })
}

HomeMaticHomeKitKeymaticService.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'STATE')) {
    let hmState = ((newValue === 'true') || (newValue === true)) ? 0 : 1
    this.current_state.updateValue(hmState, null)
    this.target_state.updateValue(hmState, null)
  }
}

module.exports = HomeMaticHomeKitKeymaticService
