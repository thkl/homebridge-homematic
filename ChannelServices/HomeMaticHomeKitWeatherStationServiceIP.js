'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitWeatherStationServiceIP (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitWeatherStationServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitWeatherStationServiceIP, HomeKitGenericService)

HomeMaticHomeKitWeatherStationServiceIP.prototype.propagateServices = function (homebridge, Service, Characteristic) {
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

HomeMaticHomeKitWeatherStationServiceIP.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this

  this.enableLoggingService('weather')
  this.currentTemperature = -255
  this.currentHumidity = -255

  // HmIP-SWO-B - TemperatureSensor, HumiditySensor, LightSensor, SunshineService, WindSpeedService
  var thermo = new Service['TemperatureSensor'](this.name)
  this.services.push(thermo)

  this.ctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({
      minValue: -100
    })
    .on('get', function (callback) {
      that.query('ACTUAL_TEMPERATURE', function (value) {
        if (callback) callback(null, value)
      })
    })

  this.setCurrentStateCharacteristic('ACTUAL_TEMPERATURE', this.ctemp)
  this.ctemp.eventEnabled = true

  var humidity = new Service['HumiditySensor'](this.name)
  this.services.push(humidity)

  this.chum = humidity.getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .on('get', function (callback) {
      that.query('HUMIDITY', function (value) {
        if (callback) callback(null, value)
      })
    })

  this.setCurrentStateCharacteristic('HUMIDITY', this.chum)
  this.chum.eventEnabled = true

  var brightness = new Service['LightSensor'](this.name)
  this.services.push(brightness)

  this.cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
    .on('get', function (callback) {
      that.query('ILLUMINATION', function (value) {
        if (callback) callback(null, value)
      })
    })

  this.setCurrentStateCharacteristic('ILLUMINATION', this.cbright)
  this.cbright.eventEnabled = true

  var sunshineduration = new Service['SunshineService'](this.name)
  this.services.push(sunshineduration)

  this.csunshineduration = sunshineduration.getCharacteristic(Characteristic.SunshineCharacteristic)
    .on('get', function (callback) {
      this.query('SUNSHINEDURATION', function (value) {
        if (callback) callback(null, value)
      })
    }.bind(this))

  this.setCurrentStateCharacteristic('SUNSHINEDURATION', this.csunshineduration)
  this.csunshineduration.eventEnabled = true

  if (this.deviceType === 'HmIP-SWO-B') {
    var windspeed = new Service['WindSpeedService'](this.name)
    this.services.push(windspeed)

    this.cwindspeed = windspeed.getCharacteristic(Characteristic.WindSpeedCharacteristic)
      .on('get', function (callback) {
        this.query('WIND_SPEED', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.setCurrentStateCharacteristic('WIND_SPEED', this.cwindspeed)
    this.cwindspeed.eventEnabled = true
  }

  // HmIP-SWO-PL - HmIP-SWO-B + RainSensor RainCountService
  if ((this.deviceType === 'HmIP-SWO-PL') || (this.deviceType === 'HmIP-SWO-PR')) {
    var raining = new Service['IsRainingService'](this.name)
    this.services.push(raining)

    var craining = raining.getCharacteristic(Characteristic.IsRainingCharacteristic)
      .on('get', function (callback) {
        that.query('RAINING', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.setCurrentStateCharacteristic('RAINING', craining)
    craining.eventEnabled = true

    var raincount = new Service['RainCountService'](this.name)
    this.services.push(raincount)

    this.craincount = raincount.getCharacteristic(Characteristic.RainCountCharacteristic)
      .on('get', function (callback) {
        this.query('RAIN_COUNTER', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.setCurrentStateCharacteristic('RAIN_COUNTER', this.craincount)
    this.craincount.eventEnabled = true
  }

  // HmIP-SWO-PR - HmIP-SWO-PL + WindDirectionService + WindRangeService
  if (this.deviceType === 'HmIP-SWO-PR') {
    var winddirection = new Service['WindDirectionService'](this.name)
    this.services.push(winddirection)

    this.cwinddirection = winddirection.getCharacteristic(Characteristic.WindDirectionCharacteristic)
      .on('get', function (callback) {
        this.query('WIND_DIR', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.setCurrentStateCharacteristic('WIND_DIR', this.cwinddirection)
    this.cwinddirection.eventEnabled = true

    var windrange = new Service['WindRangeService'](this.name)
    this.services.push(windrange)

    this.cwindrange = windrange.getCharacteristic(Characteristic.WindRangeCharacteristic)
      .on('get', function (callback) {
        this.query('WIND_DIR_RANGE', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.setCurrentStateCharacteristic('WIND_DIR_RANGE', this.cwindrange)
    this.cwindrange.eventEnabled = true
  }

  this.queryData()
}

HomeMaticHomeKitWeatherStationServiceIP.prototype.queryData = function () {
  var that = this

  this.query('ACTUAL_TEMPERATURE', function (value) {
    that.currentTemperature = parseFloat(value)
    that.query('HUMIDITY', function (value) {
      that.currentHumidity = parseFloat(value)
      if ((that.currentTemperature > -255) && (that.currentHumidity > -255)) {
        that.addLogEntry({
          temp: that.currentTemperature,
          pressure: 0,
          humidity: that.currentHumidity
        })
      }
    })
  })

  // Timer: Query device every 10 minutes
  setTimeout(function () {
    that.queryData()
  }, 10 * 60 * 1000)
}

HomeMaticHomeKitWeatherStationServiceIP.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'ACTUAL_TEMPERATURE')) {
    this.currentTemperature = parseFloat(newValue)
    this.ctemp.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'HUMIDITY')) {
    this.currentHumidity = parseFloat(newValue)
    this.chum.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'ILLUMINATION')) {
    this.cbright.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'SUNSHINEDURATION')) {
    this.csunshineduration.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'WIND_SPEED')) {
    this.cwindspeed.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'RAIN_COUNTER')) {
    this.craincount.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'WIND_DIR')) {
    this.cwinddirection.updateValue(parseFloat(newValue), null)
  }

  if (this.isDataPointEvent(dp, 'WIND_DIR_RANGE')) {
    this.cwindrange.updateValue(parseFloat(newValue), null)
  }

  // make this call a little less often
  if (((this.isDataPointEvent(dp, 'ACTUAL_TEMPERATURE')) || (this.isDataPointEvent(dp, 'HUMIDITY'))) &&
        (this.currentTemperature > -255) && (this.currentHumidity > -255)) {
    this.addLogEntry({
      temp: this.currentTemperature,
      pressure: 0,
      humidity: this.currentHumidity
    })
  }
}

module.exports = HomeMaticHomeKitWeatherStationServiceIP
