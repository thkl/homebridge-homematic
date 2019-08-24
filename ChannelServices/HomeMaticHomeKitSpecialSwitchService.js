'use strict'

const util = require('util')
var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

function HomeMaticHomeKitSpecialSwitchService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitSpecialSwitchService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitSpecialSwitchService, HomeKitGenericService)

HomeMaticHomeKitSpecialSwitchService.prototype.createDeviceService = function (Service, Characteristic) {
  let channel = this.getClazzConfigValue('channel', undefined)

  // Lightbulb , Outlet , Switch , Fan

  this.switchtype = this.getClazzConfigValue('switchtype', 'Lightbulb')

  // build interface and address
  let raw = channel.split(new RegExp('([a-z-]{1,}).([a-z0-9]{1,}):([0-9]{1,})', 'gmi'))
  this.adress = raw[1] + '.' + raw[2] + ':' + raw[3]
  this.interf = raw[1]
  this.log.debug('Init Special Switch (%s) at Interface %s Adress %s Channel %s', this.switchtype, this.interf, this.adress, this.channel)

  switch (this.switchtype) { // hahaha
    case 'Fan':
      this.service = new Service['Fan'](this.name)
      this.addisOnCharacteristic(Characteristic.On)
      break

    case 'Lightbulb':
      this.service = new Service['Lightbulb'](this.name)
      this.addisOnCharacteristic(Characteristic.On)
      break

    case 'Outlet':
      this.service = new Service['Outlet'](this.name)
      // add InUse
      this.service.getCharacteristic(Characteristic.OutletInUse)
        .on('get', function (callback) {
          callback(null, true)
        })
      this.addisOnCharacteristic(Characteristic.On)
      break

    case 'Switch':
      this.service = new Service['Switch'](this.name)
      this.addisOnCharacteristic(Characteristic.On)

      break
  }

  this.services.push(this.service)

  this.remoteGetValue('STATE', function (result) {

  })
}

HomeMaticHomeKitSpecialSwitchService.prototype.addisOnCharacteristic = function (characteristic) {
  let that = this
  this.onCharacteristic = this.service.getCharacteristic(characteristic)
    .on('get', function (callback) {
      that.query('STATE', function (value) {
        let hmState = ((value === 'true') || (value === true)) ? 1 : 0
        if (callback) callback(null, hmState)
      })
    })
    .on('set', function (value, callback) {
      let evtmp = that.eventupdate
      that.eventupdate = false

      that.log.debug('Set Command %s', value)
      that.command('setrega', 'STATE', (value === true), function () {
        that.eventupdate = evtmp
        if (callback) {
          callback()
        }
      })
    })
}

HomeMaticHomeKitSpecialSwitchService.prototype.datapointEvent = function (dp, newValue) {
  this.log.debug('Switch event %s with value %s', dp, newValue)
  if (dp === 'STATE') {
    let hmState = !!(((newValue === 'true') || (newValue === true)))
    this.onCharacteristic.updateValue(hmState, null)
  }
}

module.exports = HomeMaticHomeKitSpecialSwitchService
