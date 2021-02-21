'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitBlindServiceIP (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitBlindServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitBlindServiceIP, HomeKitGenericService)

HomeMaticHomeKitBlindServiceIP.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var blind = new Service.WindowCovering(this.name)
  this.delayOnSet = 750
  this.services.push(blind)
  this.minValueForClose = this.getClazzConfigValue('minValueForClose', 0)
  this.maxValueForOpen = this.getClazzConfigValue('maxValueForOpen', 100)
  if (this.minValueForClose > 0) {
    this.log.debug('there is a custom closed level of %s', this.minValueForClose)
  }

  if (this.maxValueForOpen < 100) {
    this.log.debug('there is a custom open level of %s', this.maxValueForOpen)
  }

  this.currentPos = blind.getCharacteristic(Characteristic.CurrentPosition)
    .on('get', function (callback) {
      that.query('4.LEVEL', function (value) {
        if (value < that.minValueForClose) {
          value = 0
        }
        if (value > that.maxValueForOpen) {
          value = 100
        }
        if (callback) callback(null, value)
      })
    })

  this.currentPos.eventEnabled = true

  this.targetPos = blind.getCharacteristic(Characteristic.TargetPosition)

    .on('get', function (callback) {
      that.query('4.LEVEL', function (value) {
        if (callback) {
          if (value < that.minValueForClose) {
            value = 0
          }
          if (value > that.maxValueForOpen) {
            value = 100
          }
          callback(null, value)
        }
      })
    })

    .on('set', function (value, callback) {
      that.delayed('set', '4.LEVEL', value, that.delayOnSet)
      if (callback !== undefined) {
        callback()
      }
    })

  var pstate = blind.getCharacteristic(Characteristic.PositionState)

    .on('get', function (callback) {
      that.query('DIRECTION', function (value) {
        if (callback) {
          var result = 2
          if (value !== undefined) {
            switch (value) {
              case 0:
                result = 2 // Characteristic.PositionState.STOPPED
                break
              case 1:
                result = 0 // Characteristic.PositionState.DECREASING
                break
              case 2:
                result = 1 // Characteristic.PositionState.INCREASING
                break
              case 3:
                result = 2 // Characteristic.PositionState.STOPPED
                break
            }
            callback(null, result)
          } else {
            callback(null, '0')
          }
        }
      })
    })

  this.setCurrentStateCharacteristic('DIRECTION', pstate)
  pstate.eventEnabled = true

  /**
    Parameter DIRECTION
    0 = NONE (Standard)
    1=UP
    2=DOWN
    3=UNDEFINED
    */

  /*
    Characteristic.PositionState.DECREASING = 0;
    Characteristic.PositionState.INCREASING = 1;
    Characteristic.PositionState.STOPPED = 2;
    */

  this.addValueMapping('DIRECTION', 0, 2)
  this.addValueMapping('DIRECTION', 1, 0)
  this.addValueMapping('DIRECTION', 2, 1)
  this.addValueMapping('DIRECTION', 3, 2)

  this.remoteGetValue('4.LEVEL', function (newValue) {
    that.processBlindLevel(newValue)
  })

  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':3.LEVEL', this, function (newValue) {
    that.processBlindLevel(newValue)
  })
  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':4.LEVEL', this, function (newValue) {
    that.processBlindLevel(newValue)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':4:PROCESS', this, function (newValue) {
    if (newValue === 0) {
      that.remoteGetValue('4.LEVEL', function (value) {
        that.processBlindLevel(value)
      })
    }
  })
}

HomeMaticHomeKitBlindServiceIP.prototype.endWorking = function () {
  let that = this
  this.remoteGetValue('4.LEVEL', function (newValue) {
    that.processBlindLevel(newValue)
  })
}

HomeMaticHomeKitBlindServiceIP.prototype.datapointEvent = function (dp, newValue) {
  let that = this

  if ((dp === '4.PROCESS') && (newValue === 0)) {
    this.remoteGetValue('4.LEVEL', function (value) {
      that.currentPos.updateValue(value, null)
      that.targetPos.updateValue(value, null)
    })
  }

  if (dp === '4.LEVEL') {
    that.currentPos.updateValue(newValue, null)
    that.targetPos.updateValue(newValue, null)
  }

  if (dp === '3.LEVEL') {
    that.currentPos.updateValue(newValue, null)
    that.targetPos.updateValue(newValue, null)
  }
}

// https://github.com/thkl/homebridge-homematic/issues/208
// if there is a custom close level and the real level is below homekit will get the 0% ... and visevera for max level
HomeMaticHomeKitBlindServiceIP.prototype.processBlindLevel = function (newValue) {
  if (newValue <= this.minValueForClose) {
    newValue = 0
  }
  if (newValue >= this.maxValueForOpen) {
    newValue = 100
  }

  this.currentPos.updateValue(newValue, null)
  this.targetPos.updateValue(newValue, null)
}

module.exports = HomeMaticHomeKitBlindServiceIP
