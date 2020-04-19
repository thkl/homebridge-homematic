'use strict'

const CustomHomeKitTypes = require('./CustomHomeKitTypes.js')

let hap

module.exports = class WeatherStationTypes extends CustomHomeKitTypes {
  constructor (homebridge) {
    super(homebridge)
    hap = homebridge.homebridge.hap
    var uuid = hap.uuid

    this.createCharacteristic('IsRainingCharacteristic', uuid.generate('HomeMatic:customchar:IsRainingCharacteristic'), {
      format: hap.Characteristic.Formats.BOOL,
      perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
    }, 'is Raining')

    this.createCharacteristic('RainCountCharacteristic', uuid.generate('HomeMatic:customchar:RainCountCharacteristic'), {
      format: hap.Characteristic.Formats.FLOAT,
      unit: 'mm',
      minStep: 0.1,
      perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
    }, 'Rain Count')

    this.createCharacteristic('WindSpeedCharacteristic', uuid.generate('HomeMatic:customchar:WindSpeedCharacteristic'), {
      format: hap.Characteristic.Formats.FLOAT,
      unit: 'km/h',
      minStep: 0.1,
      perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
    }, 'Wind speed')

    this.createCharacteristic('WindDirectionCharacteristic', uuid.generate('HomeMatic:customchar:WindDirectionCharacteristic'), {
      format: hap.Characteristic.Formats.INTEGER,
      unit: 'degree',
      perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
    }, 'Wind direction')

    this.createCharacteristic('WindRangeCharacteristic', uuid.generate('HomeMatic:customchar:WindRangeCharacteristic'), {
      format: hap.Characteristic.Formats.INTEGER,
      unit: 'degree',
      perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
    }, 'Wind range')

    this.createCharacteristic('SunshineCharacteristic', uuid.generate('HomeMatic:customchar:SunshineCharacteristic'), {
      format: hap.Characteristic.Formats.FLOAT,
      unit: 'minutes',
      perms: [hap.Characteristic.Perms.READ, hap.Characteristic.Perms.NOTIFY]
    }, 'Sunshine')

    this.createService('SunshineWeatherService', uuid.generate('HomeMatic:customchar:SimpleSunshineWeatherServiceWeatherService'), [
      this.Characteristic.SunshineCharacteristic
    ])

    this.createService('WindSpeedWeatherService', uuid.generate('HomeMatic:customchar:WindSpeedWeatherService'), [
      this.Characteristic.WindSpeedCharacteristic
    ])

    this.createService('RainService', uuid.generate('HomeMatic:customchar:RainService'), [
      this.Characteristic.IsRainingCharacteristic,
      this.Characteristic.RainCountCharacteristic
    ])

    this.createService('WindService', uuid.generate('HomeMatic:customchar:WindService'), [
      this.Characteristic.WindDirectionCharacteristic,
      this.Characteristic.WindRangeCharacteristic
    ])
  }
}
