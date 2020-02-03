'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var moment = require('moment')
let eve
var EveHomeKitTypes = require('./EveHomeKitTypes.js')

function HomeMaticHomeKitMotionDetectorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitMotionDetectorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitMotionDetectorService, HomeKitGenericService)

HomeMaticHomeKitMotionDetectorService.prototype.propagateServices = function (homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}

HomeMaticHomeKitMotionDetectorService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this

  this.enableLoggingService('motion', false)

  var sensor = new Service['MotionSensor'](this.name)
  this.state = sensor.getCharacteristic(Characteristic.MotionDetected)
    .on('get', function (callback) {
      that.query('MOTION', function (value) {
        that.addLogEntry({ status: (value === true) ? 1 : 0 })
        if (callback) callback(null, value)
      })
    })

  this.state.eventEnabled = true
  this.services.push(sensor)

  var brightness = new Service['LightSensor'](this.name)
  this.cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
    .on('get', function (callback) {
      that.query('BRIGHTNESS', function (value) {
        if (callback) { callback(null, value) } // calculate lux from HM Values is done in HomeKitGenericService.js via ... Math.pow(10, (value/51))
      })
    })

  this.cbright.eventEnabled = true
  this.services.push(brightness)

  this.addTamperedCharacteristic(sensor, Characteristic)
  this.addLowBatCharacteristic(sensor, Characteristic)

  sensor.addOptionalCharacteristic(eve.Characteristic.LastActivation)

  this.lastActivation = this.getPersistentState('lastActivation', undefined)
  if ((this.lastActivation === undefined) && (this.loggingService !== undefined)) {
    this.lastActivation = moment().unix() - this.loggingService.getInitialTime()
    this.setPersistentState('lastActivation', this.lastActivation)
  }

  this.CharacteristicLastActivation = sensor.getCharacteristic(eve.Characteristic.LastActivation)
    .on('get', function (callback) {
      callback(null, this.lastActivation)
    }.bind(this))
  this.CharacteristicLastActivation.setValue(this.lastActivation)

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.BRIGHTNESS', this, function (newValue) {
    that.cbright.updateValue(newValue, null) // calculate lux from HM Values is done in HomeKitGenericService.js via ... Math.pow(10, (value/51))
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.MOTION', this, function (newValue) {
    that.state.updateValue(newValue, null)
    that.addLogEntry({ status: (newValue === true) ? 1 : 0 })
    if (newValue === true) {
      if (that.loggingService !== undefined) {
        let firstLog = that.loggingService.getInitialTime()
        that.lastActivation = moment().unix() - firstLog
        that.CharacteristicLastActivation.updateValue(that.lastActivation, null)
        that.setPersistentState('lastActivation', that.lastActivation)
      }
    }
  })

  this.remoteGetValue('BRIGHTNESS')
  this.remoteGetValue('MOTION')
}

module.exports = HomeMaticHomeKitMotionDetectorService
