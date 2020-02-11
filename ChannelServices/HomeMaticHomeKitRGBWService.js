'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitRGBWService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitRGBWService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitRGBWService, HomeKitGenericService)

HomeMaticHomeKitRGBWService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var lightbulb = new Service.Lightbulb(this.name)
  this.services.push(lightbulb)

  this.onc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function (callback) {
      that.query('1.LEVEL', function (value) {
        if (value === undefined) {
          value = 0
        }

        that.setCache('LAST', value)
        if (callback) callback(null, value > 0)
      })
    })

    .on('set', function (value, callback) {
      var lastLevel = that.getCache('LAST')
      if (lastLevel === undefined) {
        lastLevel = -1
      }

      if (((value === true) || ((value === 1))) && ((lastLevel < 1))) {
        that.setCache('LAST', 100)
        that.command('set', '1.LEVEL', 100)
      } else

      if ((value === 0) || (value === false)) {
        that.setCache('LAST', 0)
        that.command('set', '1.LEVEL', 0)
      } else

      if (((value === true) || ((value === 1))) && ((lastLevel > 0))) {
        // Do Nothing just skip the ON Command cause the Dimmer is on
      } else {
        that.delayed('set', '1.LEVEL', lastLevel, 2)
      }

      callback()
    })

  this.brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function (callback) {
      that.query('1.LEVEL', function (value) {
        that.log.debug('[RGB] getLevel is %s', value)
        that.setCache('LAST', (value * 100))

        if (callback) callback(null, value)
      })
    })

    .on('set', function (value, callback) {
      that.newLevel = value
      clearTimeout(that.timer)
      that.timer = setTimeout(function () {
        var lastLevel = that.getCache('LAST')
        if (that.newLevel !== lastLevel) {
          if (that.newLevel === 0) {
            // set On State
            if ((that.onc !== undefined) && (that.onc.updateValue !== undefined)) {
              that.onc.updateValue(false, null)
            }
          } else {
            if ((that.onc !== undefined) && (that.onc.updateValue !== undefined)) {
              that.onc.updateValue(true, null)
            }
          }
          that.log.debug('[RGB] set new Level %s', that.newLevel)
          that.isWorking = true
          that.setCache('LAST', that.newLevel)
          that.delayed('set', '1.LEVEL', that.newLevel, 5)
        }
      }, 500)

      if (callback) callback()
    })

  this.brightness.eventEnabled = true

  this.color = lightbulb.addCharacteristic(Characteristic.Hue)

    .on('get', function (callback) {
      that.query('2.COLOR', function (value) {
        if (callback) callback(null, value)
      })
    })

    .on('set', function (value, callback) {
      if (that.sat < 10) {
        value = 361.809045226
      }

      that.log.debug('[RGB] set Hue to %s', value)
      that.delayed('set', '2.COLOR', value, 100)
      callback()
    })

  this.color.eventEnabled = true

  lightbulb.addCharacteristic(Characteristic.Saturation)
    .on('get', function (callback) {
      that.query('2.COLOR', function (value) {
        var ret = (value === 200) ? 0 : 100
        callback(null, ret)
      })
    })

    .on('set', function (value, callback) {
      that.sat = value
      if (value < 10) {
        that.delayed('set', '2.COLOR', 361.809045226, 100)
      }
      callback()
    })

  this.log.debug('[RGB] Initial Query')

  this.removeCache('1.LEVEL')
  this.remoteGetValue('1.LEVEL', function (newValue) {
    that.processDimmerLevel(newValue)
  })

  this.removeCache('2.COLOR')
  this.remoteGetValue('2.COLOR', function (newValue) {
    that.processColorValue(newValue)
  })
}

HomeMaticHomeKitRGBWService.prototype.processDimmerLevel = function (newValue) {
  this.log.debug('[RGB] processing level %s', newValue)
  this.brightness.updateValue(newValue, null)
  this.onc.updateValue((newValue > 0), null)
}

HomeMaticHomeKitRGBWService.prototype.processColorValue = function (newValue) {
  this.log.debug('[RGB] processing color %s', newValue)
  this.brightness.updateValue(newValue, null)
  this.onc.updateValue((newValue > 0), null)
}

HomeMaticHomeKitRGBWService.prototype.datapointEvent = function (dp, value) {
  this.log.debug('[RGB] recieving event for %s: %s value: %s (%s)', this.adress, dp, value, typeof (value))

  if (this.isDataPointEvent(dp, 'LEVEL')) {
    this.processDimmerLevel(value)
  }

  if (this.isDataPointEvent(dp, 'COLOE')) {
    this.processColorValue(value)
  }
}

HomeMaticHomeKitRGBWService.prototype.endWorking = function () {
  this.removeCache('1.LEVEL')
  this.remoteGetValue('1.LEVEL')
}

module.exports = HomeMaticHomeKitRGBWService
