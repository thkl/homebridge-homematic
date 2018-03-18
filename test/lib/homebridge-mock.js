'use strict';
var ServiceMock = require('./service-mock').Service;
var CharacteristicMock = require('./characteristic-mock').Characteristic;
require("./mock-types");
var AccessoryMock = require('./accessory-mock').Accessory;
var uuidMock = require('./uuid-mock');
var User = require('./user-mock').User;

module.exports = function(context) {
  return new HombridgeMock(context);
};

function HombridgeMock(context) {
  this.context = context;
  this.hap = {
    Service: ServiceMock,
    Characteristic: CharacteristicMock,
    Accessory: AccessoryMock,
    uuid: uuidMock
  };
  this.user = User;
  this.values = {};
}

HombridgeMock.prototype.registerPlatform = function (name, title, Platform) {
  this.pluginName = name;
  this.configName = title;
  this.PlatformType = Platform;
};
