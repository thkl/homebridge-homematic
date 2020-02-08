'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
// var curLevel = 0
// var lastLevel = 0
// var onc

function HomeMaticHomeKitDimmerService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitDimmerService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitDimmerService, HomeKitGenericService)

HomeMaticHomeKitDimmerService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var lightbulb = new Service.Lightbulb(this.name)
  this.delayOnSet = 5
  this.services.push(lightbulb)
  this.ignoreWorking = true
  this.inhibitWhileWorking = false
  this.newLevel = 0

  this.onc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function (callback) {
      that.query('LEVEL', function (value) {
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
        that.command('set', 'OLD_LEVEL', true)
        that.setCache('LAST', undefined)
      } else
      if ((value === 0) || (value === false)) {
        that.setCache('LAST', 0)
        that.setDimmerLevel(0)
      } else
      if (((value === true) || ((value === 1))) && ((lastLevel > 0))) {

      } else {
        that.setDimmerLevel(lastLevel)
      }
      callback()
    })

  this.onc.eventEnabled = true

  this.brightness = lightbulb.getCharacteristic(Characteristic.Brightness)
    .on('get', function (callback) {
      that.query('LEVEL', function (value) {
        that.setCache('LAST', value)
        if (callback) {
          callback(null, value)
        }
      })
    })

    .on('set', function (value, callback) {
      that.newLevel = value
      clearTimeout(that.timer)
      that.timer = setTimeout(function () {
        that.setDimmerLevel(that.newLevel)
      }, 500)
      if (callback) callback()
    })

  this.brightness.eventEnabled = true

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.WORKING', this, function (newValue) {
    that.log.debug('[DIMMER] Working is %s', newValue)
    that.inhibitWhileWorking = newValue
    if (newValue === true) {
      that.triggerWorkingTimer()
    } else {
      that.ccuCache.deleteValue(that.adress + '.LEVEL')
      that.remoteGetValue('LEVEL', function (newValue) {
        that.processDimmerLevel(newValue)
      })
    }
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.LEVEL', this, function (newValue) {
    if (!that.inhibitWhileWorking) {
      that.processDimmerLevel(newValue)
    } else {
      that.log.debug('[DIMMER] is Working save new level %s', newValue)
    }
  })

  this.remoteGetValue('LEVEL', function (newValue) {
    that.processDimmerLevel(newValue)
  })
}

HomeMaticHomeKitDimmerService.prototype.triggerWorkingTimer = function () {
  let that = this
  clearTimeout(that.workingTimer)
  that.workingTimer = setTimeout(function () {
    // switch off working after one second
    // kill the cache and ask ccu for new level
    that.inhibitWhileWorking = false
    that.ccuCache.deleteValue(that.adress + '.LEVEL')
    that.remoteGetValue('LEVEL', function (newValue) {
      that.processDimmerLevel(newValue)
    })
  }, 1000)
}

HomeMaticHomeKitDimmerService.prototype.setDimmerLevel = function (value) {
  let that = this
  var lastLevel = that.getCache('LAST')
  if (value !== lastLevel) {
    if (value === 0) {
      // set On State
      if ((that.onc !== undefined) && (that.onc.updateValue !== undefined)) {
        that.onc.updateValue(false, null)
      }
    } else {
      if ((that.onc !== undefined) && (that.onc.updateValue !== undefined)) {
        that.onc.updateValue(true, null)
      }
    }
    that.log.debug('[DIMMER] Set Brightness of ' + that.adress + ' to ' + value + ' command. LastLevel is ' + lastLevel)
    that.setCache('LAST', value)
    that.isWorking = true
    that.inhibitWhileWorking = true
    that.delayed('set', 'LEVEL', value, that.delayOnSet)
    that.triggerWorkingTimer()
  }
}

HomeMaticHomeKitDimmerService.prototype.processDimmerLevel = function (newValue) {
  this.brightness.updateValue(newValue, null)
  this.onc.updateValue((newValue > 0), null)
}

module.exports = HomeMaticHomeKitDimmerService
