'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const util = require('util')

class HomeMaticHomeKitWeatherStationServiceIP extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    var uuid = homebridge.uuid

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

    Characteristic.RainCountCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:RainCountCharacteristic')
      Characteristic.call(this, 'Regenmenge', charUUID)
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        unit: 'mm',
        minStep: 0.1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.RainCountCharacteristic, Characteristic)

    Service.RainCountService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:RainCountService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.RainCountCharacteristic)
    }

    util.inherits(Service.RainCountService, Service)

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

    Characteristic.SunshineCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:SunshineCharacteristic')
      Characteristic.call(this, 'Sonnenscheindauer', charUUID)
      this.setProps({
        format: Characteristic.Formats.FLOAT,
        unit: 'Minuten',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.SunshineCharacteristic, Characteristic)

    Service.SunshineService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:SunshineService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.SunshineCharacteristic)
    }

    util.inherits(Service.SunshineService, Service)
  }

  createDeviceService (Service, Characteristic) {
    var self = this

    this.enableLoggingService('weather')
    this.currentTemperature = -255
    this.currentHumidity = -255

    // HmIP-SWO-B - TemperatureSensor, HumiditySensor, LightSensor, SunshineService, WindSpeedService
    var thermo = this.getService(Service.TemperatureSensor)

    this.currentTemperatureCharacteristic = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100
      })
      .on('get', function (callback) {
        self.query('ACTUAL_TEMPERATURE', function (value) {
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
        self.query('ILLUMINATION', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.currentBrightnessCharacteristic.eventEnabled = true

    var sunshineduration = this.getService(Service.SunshineService)

    this.characteristicSunshine = sunshineduration.getCharacteristic(Characteristic.SunshineCharacteristic)
      .on('get', function (callback) {
        this.query('SUNSHINEDURATION', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.characteristicSunshine.eventEnabled = true

    if (this.deviceType === 'HmIP-SWO-B') {
      var windspeed = this.getService(Service.WindSpeedService)

      this.characteristicWindSpeed = windspeed.getCharacteristic(Characteristic.WindSpeedCharacteristic)
        .on('get', function (callback) {
          this.query('WIND_SPEED', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicWindSpeed.eventEnabled = true
    }

    // HmIP-SWO-PL - HmIP-SWO-B + RainSensor RainCountService
    if ((this.deviceType === 'HmIP-SWO-PL') || (this.deviceType === 'HmIP-SWO-PR')) {
      var raining = this.getService(Service.IsRainingService)

      this.characteristicIsRaining = raining.getCharacteristic(Characteristic.IsRainingCharacteristic)
        .on('get', function (callback) {
          self.query('RAINING', function (value) {
            if (callback) callback(null, value)
          })
        })

      this.characteristicIsRaining.eventEnabled = true

      var raincount = this.getService(Service.RainCountService)

      this.characteristicRainCount = raincount.getCharacteristic(Characteristic.RainCountCharacteristic)
        .on('get', function (callback) {
          this.query('RAIN_COUNTER', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicRainCount.eventEnabled = true
    }

    // HmIP-SWO-PR - HmIP-SWO-PL + WindDirectionService + WindRangeService
    if (this.deviceType === 'HmIP-SWO-PR') {
      var winddirection = this.getService(Service.WindDirectionService)

      this.characteristicWindDirection = winddirection.getCharacteristic(Characteristic.WindDirectionCharacteristic)
        .on('get', function (callback) {
          this.query('WIND_DIR', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicWindDirection.eventEnabled = true

      var windrange = this.getService(Service.WindRangeService)

      this.characteristicWindRange = windrange.getCharacteristic(Characteristic.WindRangeCharacteristic)
        .on('get', function (callback) {
          this.query('WIND_DIR_RANGE', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicWindRange.eventEnabled = true
    }

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('ACTUAL_TEMPERATURE'), this, function (newValue) {
      self.currentTemperature = parseFloat(newValue)
      self.currentTemperatureCharacteristic.updateValue(parseFloat(newValue), null)
      if ((self.currentTemperature > -255) && (self.currentHumidity > -255)) {
        self.addLogEntry({ temp: self.currentTemperature, pressure: 0, humidity: self.currentHumidity })
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('HUMIDITY'), this, function (newValue) {
      self.currentHumidity = parseFloat(newValue)
      self.currentHumidityCharacteristic.updateValue(parseFloat(newValue), null)
      if ((self.currentTemperature > -255) && (self.currentHumidity > -255)) {
        self.addLogEntry({ temp: self.currentTemperature, pressure: 0, humidity: self.currentHumidity })
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('ILLUMINATION'), this, function (newValue) {
      self.currentBrightnessCharacteristic.updateValue(parseFloat(newValue), null)
    })

    if (this.characteristicRainCount) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('RAIN_COUNTER'), this, function (newValue) {
        self.characteristicRainCount.updateValue(parseFloat(newValue), null)
      })
    }

    if (this.characteristicIsRaining) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('RAINING'), this, function (newValue) {
        self.characteristicRain.updateValue(self.isTrue(newValue) ? 1 : 0)
      })
    }

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('WINDSPEED'), this, function (newValue) {
      self.characteristicWindspeed.updateValue(parseFloat(newValue), null)
    })

    if (this.characteristicWindDirection) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('WIND_DIR'), this, function (newValue) {
        self.characteristicWindDirection.updateValue(parseInt(newValue), null)
      })
    }

    if (this.characteristicWindRange) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('WIND_DIR_RANGE'), this, function (newValue) {
        self.characteristicWindRange.updateValue(parseInt(newValue), null)
      })
    }

    this.queryData()
  }

  queryData () {
    var self = this

    this.removeCache('ACTUAL_TEMPERATURE')
    this.removeCache('HUMIDITY')
    this.remoteGetValue('ACTUAL_TEMPERATURE')
    this.remoteGetValue('HUMIDITY')

    // Timer: Query device every 10 minutes
    setTimeout(function () {
      self.queryData()
    }, 10 * 60 * 1000)
  }
}

module.exports = HomeMaticHomeKitWeatherStationServiceIP
