'use strict'

const CustomHomeKitTypes = require('./CustomHomeKitTypes.js')


let hap

module.exports = class EveHomeKitTypes extends CustomHomeKitTypes {

  constructor (homebridge) {
      super(homebridge)
      hap = homebridge.homebridge.hap


  this.createCharacteristic('OpenDuration','E863F118-079E-48FF-8F27-9C2605A29F52',{
    format: hap.Characteristic.Formats.UINT32,
    unit: hap.Characteristic.Units.SECONDS,
    perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY, hap.Characteristic.Perms.WRITE]
  })


  this.createCharacteristic('ClosedDuration','E863F119-079E-48FF-8F27-9C2605A29F52',{
    format: hap.Characteristic.Formats.UINT32,
    unit: hap.Characteristic.Units.SECONDS,
    perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY, hap.Characteristic.Perms.WRITE]
  })

  this.createCharacteristic('ResetTotal','E863F112-079E-48FF-8F27-9C2605A29F52',{
    format: hap.Characteristic.Formats.UINT32,
    unit: hap.Characteristic.Units.SECONDS,
    perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY, hap.Characteristic.Perms.WRITE]
  })


  this.createCharacteristic('TimesOpened','E863F129-079E-48FF-8F27-9C2605A29F52',{
    format: hap.Characteristic.Formats.UINT32,
    unit: hap.Characteristic.Units.SECONDS,
    perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
  })


  this.createCharacteristic('LastActivation','E863F11A-079E-48FF-8F27-9C2605A29F52',{
    format: hap.Characteristic.Formats.UINT32,
    unit: hap.Characteristic.Units.SECONDS,
    perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
  })
 }
}
