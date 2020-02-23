'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitBlindServiceIP extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var blind = this.getService(Service.WindowCovering)
    this.delayOnSet = 750
    this.minValueForClose = this.getClazzConfigValue('minValueForClose', 0)
    this.maxValueForOpen = this.getClazzConfigValue('maxValueForOpen', 100)
    if (this.minValueForClose > 0) {
      this.log.debug('[BLINDIP] there is a custom closed level of %s', this.minValueForClose)
    }

    if (this.maxValueForOpen < 100) {
      this.log.debug('[BLINDIP] there is a custom open level of %s', this.maxValueForOpen)
    }

    this.currentPos = blind.getCharacteristic(Characteristic.CurrentPosition)
      .on('get', function (callback) {
        self.query('4.LEVEL', function (value) {
          value = (value * 100)
          self.log.debug('[BLINDIP] getCurrentPosition %s', value)
          if (value < self.minValueForClose) {
            value = 0
          }
          if (value > self.maxValueForOpen) {
            value = 100
          }
          if (callback) callback(null, value)
        })
      })

    this.currentPos.eventEnabled = true

    this.targetPos = blind.getCharacteristic(Characteristic.TargetPosition)

      .on('get', function (callback) {
        self.query('4.LEVEL', function (value) {
          value = (value * 100)
          self.log.debug('[BLINDIP] getTargetPosition %s', value)
          if (callback) {
            if (value < self.minValueForClose) {
              value = 0
            }
            if (value > self.maxValueForOpen) {
              value = 100
            }
            callback(null, value)
          }
        })
      })

      .on('set', function (value, callback) {
        self.delayed('set', '4.LEVEL', (parseFloat(value) / 100), self.delayOnSet)
        if (callback !== undefined) {
          callback()
        }
      })

    var pstate = blind.getCharacteristic(Characteristic.PositionState)

      .on('get', function (callback) {
        self.query('DIRECTION', function (value) {
          if (callback) {
            if (value !== undefined) {
              callback(null, value)
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

    this.deviceaddress = this.address.slice(0, this.address.indexOf(':'))

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('3.LEVEL'), this, function (newValue) {
      self.processBlindLevel(parseFloat(newValue) * 100)
    })
    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('4.LEVEL'), this, function (newValue) {
      self.processBlindLevel(parseFloat(newValue) * 100)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('4:PROCESS'), this, function (newValue) {
      if (newValue === 0) {
        self.removeCache('4.LEVEL')
        self.remoteGetValue('4.LEVEL')
      }
    })
  }

  endWorking () {
    this.remoteGetValue('4.LEVEL')
  }

  // https://github.com/thkl/homebridge-homematic/issues/208
  // if there is a custom close level and the real level is below homekit will get the 0% ... and visevera for max level

  processBlindLevel (newValue) {
    if (newValue <= this.minValueForClose) {
      newValue = 0
    }
    if (newValue >= this.maxValueForOpen) {
      newValue = 100
    }

    this.currentPos.updateValue(newValue, null)
    this.targetPos.updateValue(newValue, null)
  }
}
module.exports = HomeMaticHomeKitBlindServiceIP
