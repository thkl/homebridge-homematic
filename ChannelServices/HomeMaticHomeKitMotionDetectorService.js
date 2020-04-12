'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const moment = require('moment')
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

class HomeMaticHomeKitMotionDetectorService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    var self = this

    this.historyEnabled = this.getClazzConfigValue('enable_history', false)

    if (this.historyEnabled === true) {
      this.enableLoggingService('motion')
    }

    var sensor = this.getService(Service.MotionSensor)
    this.state = sensor.getCharacteristic(Characteristic.MotionDetected)
      .on('get', function (callback) {
        self.query('MOTION', function (value) {
          if ((self.historyEnabled === true) && (self.loggingService)) {
            self.addLogEntry({ status: (value === true) ? 1 : 0 })
          }
          if (callback) callback(null, value)
        })
      })

    this.state.eventEnabled = true

    var brightness = this.getService(Service.LightSensor)
    this.cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function (callback) {
        self.query('BRIGHTNESS', function (value) {
          if (callback) { callback(null, value) } // calculation lux from HM Values is done in HomeKitGenericService.js via ... Math.pow(10, (value/51))
        })
      })

    this.cbright.eventEnabled = true

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

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('BRIGHTNESS'), this, function (newValue) {
      self.cbright.updateValue(newValue, null) // calculation lux from HM Values is done in HomeKitGenericService.js via ... Math.pow(10, (value/51))
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('MOTION'), this, function (newValue) {
      self.state.updateValue(newValue, null)
      self.addLogEntry({ status: (newValue === true) ? 1 : 0 })
      if (newValue === true) {
        if (self.loggingService !== undefined) {
          let firstLog = self.loggingService.getInitialTime()
          self.lastActivation = moment().unix() - firstLog
          self.CharacteristicLastActivation.updateValue(self.lastActivation, null)
          self.setPersistentState('lastActivation', self.lastActivation)
        }
      }
    })
  }

  validateConfig (configuration) {
    // things to check
    return ((configuration) &&
    (configuration.enable_history) &&
    ([true, false].indexOf(configuration.enable_history) > -1)
    )
  }

  configItems () {
    return ['enable_history']
  }
}

module.exports = HomeMaticHomeKitMotionDetectorService
