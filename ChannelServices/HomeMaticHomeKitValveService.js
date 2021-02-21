'use strict'

const util = require('util')
var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

function HomeMaticHomeKitValveService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitValveService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitValveService, HomeKitGenericService)

HomeMaticHomeKitValveService.prototype.createDeviceService = function (Service, Characteristic) {
  let that = this
  let channel = this.getClazzConfigValue('channel', undefined)
  // build interface and address
  let raw = channel.split(new RegExp('([a-z-]{1,}).([a-z0-9]{1,}):([0-9]{1,})', 'gmi'))
  this.adress = raw[1] + '.' + raw[2] + ':' + raw[3]
  this.interf = raw[1]
  this.log.debug('Init Special Valve at Interface %s Adress %s Channel %s', this.interf, this.adress, this.channel)
  var valveService = new Service['Valve'](this.name)
  this.valvestate = 0 // NOT_IN_USE = 0;
  var valveType = valveService.getCharacteristic(Characteristic.ValveType)
    .on('get', function (callback) {
      callback(null, 0)
    })

  valveType.updateValue(0, null)

  this.c_isActive = valveService.getCharacteristic(Characteristic.Active)
    .on('get', function (callback) {
      that.log.debug('get Active')
      that.query('STATE', function (value) {
        let hmState = ((value === 'true') || (value === true)) ? 1 : 0
        if (callback) callback(null, hmState)
      })
    })

    .on('set', function (value, callback) {
      let evtmp = that.eventupdate
      that.eventupdate = false
      that.log.debug('Set Command %s', value)
      if (value === 0) {
        that.command('setrega', 'STATE', false)
        that.eventupdate = evtmp
        callback()
      } else {
        that.command('setrega', 'STATE', true)
        that.eventupdate = evtmp
        callback()
      }
    })

  this.c_isActive.updateValue(Characteristic.Active.ACTIVE, null)

  this.c_isInUse = valveService.getCharacteristic(Characteristic.InUse)
    .on('get', function (callback) {
      if (callback) callback(null, that.valvestate)
    })

    .on('set', function (value, callback) {
      callback()
    })

  this.services.push(valveService)
  this.remoteGetValue('STATE', function (result) {
    that.setValve(result)
  })
}

HomeMaticHomeKitValveService.prototype.setValve = function (state) {
  this.log.debug('Set homkit valve State %s', state)
  let that = this
  let hkvalue = (state === true) ? 1 : 0
  this.c_isActive.updateValue(hkvalue, null)
  setTimeout(function () {
    that.c_isInUse.updateValue(hkvalue, null)
  }, 1000)
}

HomeMaticHomeKitValveService.prototype.datapointEvent = function (dp, newValue) {
  this.log.debug('Valve event %s with value %s', dp, newValue)
  if (dp === 'STATE') {
    let hmState = 0 // NOT_IN_USE = 0;
    if ((newValue === 'true') || (newValue === true)) {
      hmState = 1 // IN_USE = 1;
    }
    this.valvestate = hmState
    this.setValve(hmState)
  }
}

module.exports = HomeMaticHomeKitValveService
