'use strict'
var ServiceMock = require('./service-mock').Service
var CharacteristicMock = require('./characteristic-mock').Characteristic
require('./mock-types')
var AccessoryMock = require('./accessory-mock').Accessory
var uuidMock = require('./uuid-mock')
var User = require('./user-mock').User
const log = require('./logger')._system

module.exports = function (context) {
  return new HombridgeMock(context)
}

function HombridgeMock(context) {
  this.context = context
  this.hap = {
    Service: ServiceMock,
    Characteristic: CharacteristicMock,
    Accessory: AccessoryMock,
    uuid: uuidMock
  }
  this.user = User
  this.values = {}
  this.platformAccessory = AccessoryMock
  this.events = {}
}

HombridgeMock.prototype.setCCUDummyValue = function (address, value) {
  log.debug('[CCU Dummy] Set TestStorage Value of %s to %s', address, value)
  this.values[address] = value
}

HombridgeMock.prototype.getCCUDummyValue = function (address) {
  let value = this.values[address]
  log.debug('[CCU Dummy] Get TestStorage Value of %s : %s', address, value)
  return value
}

HombridgeMock.prototype.registerPlatform = function (name, title, Platform) {
  this.pluginName = name
  this.configName = title
  this.PlatformType = Platform
}

HombridgeMock.prototype.registerPlatformAccessories = function (pluginName, platformName, accessories) {
  this._accessories = accessories
}

HombridgeMock.prototype.unregisterPlatformAccessories = function (pluginName, platformName, accessories) {
}

HombridgeMock.prototype.accessories = function (callback) {
  if (callback) {
    callback(this._accessories)
  }
}
HombridgeMock.prototype.fireHomeBridgeEvent = function (event) {
  let callback = this.events[event]
  if (callback) {
    callback()
  }
}

HombridgeMock.prototype.on = function (event, callback) {
  this.events[event] = callback
}
