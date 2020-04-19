'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const util = require('util')

class HomeMaticHomeKitWeatherStationService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    var uuid = homebridge.homebridge.hap.uuid

    Characteristic.IsRainingCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:IsRainingCharacteristic')
      Characteristic.call(this, 'Regen', charUUID)
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.IsRainingCharacteristic, Characteristic)

    Service.IsRainingService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:IsRainingService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.IsRainingCharacteristic)
    }

    util.inherits(Service.IsRainingService, Service)

    Characteristic.WindSpeedCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:WindSpeedCharacteristic')
      Characteristic.call(this, 'Wind Geschwindigkeit', charUUID)
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        unit: 'km/h',
        minStep: 0.1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.WindSpeedCharacteristic, Characteristic)

    Service.WindSpeedService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:WindSpeedService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.WindSpeedCharacteristic)
    }

    util.inherits(Service.WindSpeedService, Service)

    Characteristic.WindDirectionCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:WindDirectionCharacteristic')
      Characteristic.call(this, 'Wind Richtung', charUUID)
      this.setProps({
        format: Characteristic.Formats.INTEGER,
        unit: 'Grad',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.WindDirectionCharacteristic, Characteristic)

    Service.WindDirectionService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:WindDirectionService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.WindDirectionCharacteristic)
    }

    util.inherits(Service.WindDirectionService, Service)

    Characteristic.WindRangeCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:WindRangeCharacteristic')
      Characteristic.call(this, 'Wind Schwankungsbreite', charUUID)
      this.setProps({
        format: Characteristic.Formats.INTEGER,
        unit: 'Grad',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.WindRangeCharacteristic, Characteristic)

    Service.WindRangeService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:WindRangeService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.WindRangeCharacteristic)
    }

    util.inherits(Service.WindRangeService, Service)
  }

  createDeviceService (Service, Characteristic) {
    var self = this

    this.enableLoggingService('weather')
    this.currentTemperature = -255
    this.currentHumidity = -255

    var thermo = this.getService(Service.TemperatureSensor)
    this.currentTemperatureCharacteristic = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -100 })
      .on('get', function (callback) {
        self.query('TEMPERATURE', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.currentTemperatureCharacteristic.eventEnabled = true

    var humidity = this.getService(Service.HumiditySensor)

    this.currentHumidityCharacteristic = humidity.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', function (callback) {
        self.query('HUMIDITY', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.currentHumidityCharacteristic.eventEnabled = true

    var brightness = this.getService(Service.LightSensor)

    this.currentBrightnessCharacteristic = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function (callback) {
        self.query('BRIGHTNESS', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.currentBrightnessCharacteristic.eventEnabled = true

    var rain = this.getService(Service.IsRainingService)

    this.characteristicRain = rain.getCharacteristic(Characteristic.IsRainingCharacteristic)
      .on('get', function (callback) {
        self.query('RAINING', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.characteristicRain.eventEnabled = true

    var windspeed = this.getService(Service.WindSpeedService)
    this.characteristicWindspeed = windspeed.getCharacteristic(Characteristic.WindSpeedCharacteristic)
      .on('get', function (callback) {
        self.query('WIND_SPEED', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.characteristicWindspeed.eventEnabled = true

    var winddirection = this.getService(Service.WindDirectionService)
    this.characteristicWindDirection = winddirection.getCharacteristic(Characteristic.WindDirectionCharacteristic)
      .on('get', function (callback) {
        self.query('WIND_DIRECTION', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.characteristicWindDirection.eventEnabled = true

    var windrange = this.getService(Service.WindRangeService)
    this.characteristicWindRange = windrange.getCharacteristic(Characteristic.WindRangeCharacteristic)
      .on('get', function (callback) {
        self.query('WIND_DIRECTION_RANGE', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.characteristicWindRange.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('TEMPERATURE'), this, function (newValue) {
      self.currentTemperature = parseFloat(newValue)
      self.currentTemperatureCharacteristic.updateValue(parseFloat(newValue), null)
      if ((self.currentTemperature > -255) && (self.currentHumidity > -255)) {
        self.addLogEntry({ temp: self.currentTemperature, pressure: 0, humidity: self.currentHumidity })
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('HUMIDITY'), this, function (newValue) {
      self.currentHumidity = parseFloat(newValue)
      self.currentHumidityCharacteristic.updateValue(parseFloat(newValue), null)
      if ((self.currentTemperature > -255) && (self.currentHumidity > -255)) {
        self.addLogEntry({ temp: self.currentTemperature, pressure: 0, humidity: self.currentHumidity })
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('BRIGHTNESS'), this, function (newValue) {
      self.currentBrightnessCharacteristic.updateValue(parseFloat(newValue), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('RAINING'), this, function (newValue) {
      self.characteristicRain.updateValue(self.isTrue(newValue) ? 1 : 0)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('WINDSPEED'), this, function (newValue) {
      self.characteristicWindspeed.updateValue(parseFloat(newValue), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('WIND_DIRECTION'), this, function (newValue) {
      self.characteristicWindDirection.updateValue(parseInt(newValue), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('WIND_DIRECTION_RANGE'), this, function (newValue) {
      self.characteristicWindRange.updateValue(parseInt(newValue), null)
    })

    this.queryData()
  }

  queryData () {
    var self = this

    this.removeCache('TEMPERATURE')
    this.removeCache('HUMIDITY')
    this.remoteGetValue('TEMPERATURE')
    this.remoteGetValue('HUMIDITY')

    // Timer: Query device every 10 minutes
    setTimeout(function () { self.queryData() }, 10 * 60 * 1000)
  }
}

module.exports = HomeMaticHomeKitWeatherStationService
