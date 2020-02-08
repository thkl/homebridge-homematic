'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitWinMaticService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitWinMaticService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitWinMaticService, HomeKitGenericService)

HomeMaticHomeKitWinMaticService.prototype.propagateServices = function (homebridge, Service, Characteristic) {

  // Register new Characteristic or Services here

}

HomeMaticHomeKitWinMaticService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.shouldLock = false
  var window = new Service.Window(this.name)
  this.services.push(window)

  this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition)

  this.cwindow.on('get', function (callback) {
    that.query('LEVEL', function (value) {
      if (value < 0) {
        value = 0
      }
      if (callback) callback(null, value)
    })
  })

  this.setCurrentStateCharacteristic('LEVEL', this.cwindow)
  this.cwindow.eventEnabled = true

  this.swindow = window.getCharacteristic(Characteristic.TargetPosition)

  this.swindow.on('set', function (value, callback) {
    if (value === 0) {
      // Lock Window on Close Event
      that.log.info('[WinMatic] set to 0 -> should lock')
      that.shouldLock = true
    }
    that.command('setrega', 'SPEED', 1)
    that.delayed('set', 'LEVEL', value)
    callback()
  })

  this.wpos = window.getCharacteristic(Characteristic.PositionState)

  this.wpos.on('get', function (callback) {
    that.query('DIRECTION', function (value) {
      var hcvalue = 0
      hcvalue = value
      // may there are some mappings needed

      // D = 0
      // i = 1
      // s = 2

      if (callback) callback(null, hcvalue)
    })
  })
}

HomeMaticHomeKitWinMaticService.prototype.endWorking = function () {
  let that = this
  this.log.info('[WinMatic] End Working')

  if (this.shouldLock === true) {
    this.log.debug('[WinMatic] ShouldLock is set -> send -0.005')
    this.command('setrega', 'SPEED', 1)
    this.delayed('set', 'LEVEL', -0.5) // The core is dividing by 100 so to set -0.005 we have to set -0.5 ...
  }

  this.shouldLock = false
  this.removeCache('LEVEL')
  this.remoteGetValue('LEVEL', function (value) {
    // -0.005 is locked -> ignore and set to closed
    if (value === -0.005) {
      value = 0
    }
    that.cwindow.updateValue(value, null)
    that.swindow.updateValue(value, null)
    that.wpos.updateValue(2, null)
  })
}

module.exports = HomeMaticHomeKitWinMaticService
