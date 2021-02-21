'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitKeyService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitKeyService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitKeyService, HomeKitGenericService)

HomeMaticHomeKitKeyService.prototype.createDeviceService = function (Service, Characteristic) {
  this.isMultiChannel = false
  var key = new Service.StatelessProgrammableSwitch(this.name)
  var cc = key.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
  this.currentStateCharacteristic['PRESS_SHORT'] = cc
  this.currentStateCharacteristic['PRESS_LONG'] = cc
  this.services.push(key)
}

module.exports = HomeMaticHomeKitKeyService
