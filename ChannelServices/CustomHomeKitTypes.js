'use strict';
var util = require("util");

let hap

module.exports = class CustomHomeKitTypes {

  constructor (homebridge) {
      hap = homebridge.homebridge.hap
      this.Characteristic = {}
  }


  createCharacteristic (name, uuid, props, displayName = name) {
      this.Characteristic[name] = function () {
        hap.Characteristic.call(this, displayName, uuid)
        this.setProps(props)
        this.value = this.getDefaultValue()
      }
      util.inherits(this.Characteristic[name], hap.Characteristic)
      this.Characteristic[name].UUID = uuid
    }

}
