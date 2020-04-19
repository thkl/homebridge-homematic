'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const WeatherStationTypes = require('./WeatherStationTypes.js')
let weatherTypes

class HomeMaticHomeKitWeatherStationServiceIP extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    weatherTypes = new WeatherStationTypes(homebridge)
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

    let sunshine = this.getService(weatherTypes.Service.SunshineWeatherService)
    this.characteristicSunshine = sunshine.getCharacteristic(weatherTypes.Characteristic.SunshineCharacteristic)
      .on('get', function (callback) {
        this.query('SUNSHINEDURATION', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))
    this.characteristicSunshine.eventEnabled = true

    if (this.deviceType === 'HmIP-SWO-B') {
      var windspeed = this.getService(weatherTypes.Service.WindSpeedWeatherService)

      this.characteristicWindSpeed = windspeed.getCharacteristic(weatherTypes.Characteristic.WindSpeedCharacteristic)
        .on('get', function (callback) {
          this.query('WIND_SPEED', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicWindSpeed.eventEnabled = true
    }

    // HmIP-SWO-PL - HmIP-SWO-B + RainSensor RainCountService
    if ((this.deviceType === 'HmIP-SWO-PL') || (this.deviceType === 'HmIP-SWO-PR')) {
      var rainService = this.getService(weatherTypes.Service.RainService)

      this.characteristicIsRaining = rainService.getCharacteristic(weatherTypes.Characteristic.IsRainingCharacteristic)
        .on('get', function (callback) {
          self.query('RAINING', function (value) {
            if (callback) callback(null, value)
          })
        })

      this.characteristicIsRaining.eventEnabled = true

      this.characteristicRainCount = rainService.getCharacteristic(weatherTypes.Characteristic.RainCountCharacteristic)
        .on('get', function (callback) {
          this.query('RAIN_COUNTER', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicRainCount.eventEnabled = true
    }

    // HmIP-SWO-PR - HmIP-SWO-PL + WindDirectionService + WindRangeService
    if (this.deviceType === 'HmIP-SWO-PR') {
      var windService = this.getService(weatherTypes.Service.WindService)

      this.characteristicWindDirection = windService.getCharacteristic(Characteristic.WindDirectionCharacteristic)
        .on('get', function (callback) {
          this.query('WIND_DIR', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicWindDirection.eventEnabled = true

      this.characteristicWindRange = windService.getCharacteristic(Characteristic.WindRangeCharacteristic)
        .on('get', function (callback) {
          this.query('WIND_DIR_RANGE', function (value) {
            if (callback) callback(null, value)
          })
        }.bind(this))

      this.characteristicWindRange.eventEnabled = true
    }

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('ACTUAL_TEMPERATURE'), this, function (newValue) {
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

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('ILLUMINATION'), this, function (newValue) {
      self.currentBrightnessCharacteristic.updateValue(parseFloat(newValue), null)
    })

    if (this.characteristicRainCount) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('RAIN_COUNTER'), this, function (newValue) {
        self.characteristicRainCount.updateValue(parseFloat(newValue), null)
      })
    }

    if (this.characteristicSunshine) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('SUNSHINEDURATION'), this, function (newValue) {
        self.characteristicSunshine.updateValue(parseFloat(newValue))
      })
    }

    if (this.characteristicIsRaining) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('RAINING'), this, function (newValue) {
        self.characteristicRain.updateValue(self.isTrue(newValue) ? 1 : 0)
      })
    }

    if (this.characteristicWindspeed) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('WINDSPEED'), this, function (newValue) {
        if (self.characteristicWindspeed) {
          self.characteristicWindspeed.updateValue(parseFloat(newValue), null)
        }
      })
    }

    if (this.characteristicWindDirection) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('WIND_DIR'), this, function (newValue) {
        self.characteristicWindDirection.updateValue(parseInt(newValue), null)
      })
    }

    if (this.characteristicWindRange) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('WIND_DIR_RANGE'), this, function (newValue) {
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
