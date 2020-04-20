'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitBlindService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitBlindService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitBlindService, HomeKitGenericService)

HomeMaticHomeKitBlindService.prototype.createDeviceService = function (Service, Characteristic) {
  var blind = new Service.WindowCovering(this.name)
  this.delayOnSet = 750
  this.observeInhibit = this.getClazzConfigValue('observeInhibit', false)
  this.inhibit = false
  this.minValueForClose = this.getClazzConfigValue('minValueForClose', 0)
  this.maxValueForOpen = this.getClazzConfigValue('maxValueForOpen', 100)
  this.ignoreWorking = true
  this.currentLevel = 0
  this.targetLevel = undefined

  if (this.minValueForClose > 0) {
    this.log.debug('[BLIND] there is a custom closed level of %s', this.minValueForClose)
  }

  if (this.maxValueForOpen < 100) {
    this.log.debug('[BLIND] there is a custom open level of %s', this.maxValueForOpen)
  }

  this.services.push(blind)

  this.currentPos = blind.getCharacteristic(Characteristic.CurrentPosition)
    .on('get', (callback) => {
      this.query('LEVEL', (value) => {
        if (value < this.minValueForClose) {
          value = 0
        }
        if (value > this.maxValueForOpen) {
          value = 100
        }
        if (callback) callback(null, value)
      })
    })

  this.currentPos.eventEnabled = true

  this.targetPos = blind.getCharacteristic(Characteristic.TargetPosition)
    .on('get', (callback) => {
      this.query('LEVEL', (value) => {
        if (callback) {
          if (value <= this.minValueForClose) {
            value = 0
          }
          if (value >= this.maxValueForOpen) {
            value = 100
          }
          callback(null, value)
        }
      })
    })
    .on('set', (value, callback) => {
      // if obstruction has been detected
      if ((this.observeInhibit === true) && (this.inhibit === true)) {
        // wait one second to resync data
        this.log.debug('[BLIND] inhibit is true wait to resync')
        setTimeout(() => {
          this.queryData()
        }, 1000)
      } else {
        this.targetLevel = value
        this.eventupdate = false // whaat?
        this.delayed('set', 'LEVEL', value, this.delayOnSet)
      }
      callback()
    })

  this.pstate = blind.getCharacteristic(Characteristic.PositionState)
    .on('get', (callback) => {
      this.query('DIRECTION', (value) => {
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

  // this.pstate.eventEnabled = true

  // only add if ObstructionDetected is used
  if (this.observeInhibit === true) {
    this.obstruction = blind.getCharacteristic(Characteristic.ObstructionDetected)
      .on('get', (callback) => {
        callback(null, this.inhibit)
      })
    this.obstruction.eventEnabled = true
    this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.INHIBIT', this)
  }

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.DIRECTION', this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.LEVEL', this)
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))
  this.queryData()
}

HomeMaticHomeKitBlindService.prototype.queryData = function (value) {
  // trigger new event (datapointEvent)
  // kill the cache first
  this.removeCache('LEVEL')
  this.remoteGetValue('LEVEL', () => {})

  if (this.observeInhibit === true) {
    this.query('INHIBIT', (value) => {
      this.updateObstruction(JSON.parse(value)) // not sure why value (true/false) is currently a string? - but lets convert it if it is
    })
  }
}

// https://github.com/thkl/homebridge-homematic/issues/208
// if there is a custom close level and the real level is below homekit will get the 0% ... and visevera for max level
HomeMaticHomeKitBlindService.prototype.setFinalBlindLevel = function (value) {
  if (value < this.minValueForClose) {
    value = 0
  }
  if (value > this.maxValueForOpen) {
    value = 100
  }

  this.currentPos.updateValue(value, null)
  this.targetPos.updateValue(value, null)
  this.targetLevel = undefined
  this.pstate.updateValue(2, null) // STOPPED
}

HomeMaticHomeKitBlindService.prototype.datapointEvent = function (dp, value) {
  let that = this
  this.log.debug('[BLIND] recieving event for %s: %s value: %s (%s)', this.adress, dp, value, typeof (value))

  if (this.isDataPointEvent(dp, 'INHIBIT')) {
    this.inhibit = value
    if (this.obstruction !== undefined) {
      this.obstruction.updateValue(value, null)
    }
  }

  if (this.isDataPointEvent(dp, 'DIRECTION')) {
    this.updatePosition(value)
  }

  // if (this.isDataPointEvent(dp, 'WORKING_SLATS')) {
  //   if (value === false) {
  //     this.remoteGetValue('LEVEL', (value) => {
  //       this.currentPos.updateValue(value, null)
  //       this.targetPos.updateValue(value, null)
  //     })
  //   }
  // }

  if (this.isDataPointEvent(dp, 'LEVEL')) {
    this.currentLevel = value
    this.currentPos.updateValue(value, null)
  }

  if (this.isDataPointEvent(dp, 'WORKING')) {
    // Working - query for new level
    if (value === true) {
      // Force triggering new events every 750 ms
      // This is currenly not needed,
      // since there is no visual indicator in homekit while opening/closing
      // clearInterval(this.currentLevelInterval)
      // this.currentLevelInterval = setInterval(() => {
      //   this.remoteGetValue('LEVEL', () => {}) // trigger events
      //   }, 750)
      //
    } else { // STOPPED - stop quering and set tagetPosition
      // clearInterval(this.currentLevelInterval);
      this.removeCache('LEVEL')
      this.remoteGetValue('LEVEL', function (newValue) {
        that.currentLevel = newValue
        that.setFinalBlindLevel(that.currentLevel)
      })
    }
  }
}

HomeMaticHomeKitBlindService.prototype.updatePosition = function (value) {
  // 0 = NONE (Standard)
  // 1=UP
  // 2=DOWN
  // 3=UNDEFINED
  switch (value) {
    case 0:
      this.pstate.updateValue(2, null)
      break
    case 1: // opening - INCREASING
      this.pstate.updateValue(1, null)
      // set target position to maximum, since we don't know when it stops
      this.guessTargetPosition(100)
      break
    case 2: // closing - DECREASING
      this.pstate.updateValue(0, null)
      // same for closing
      this.guessTargetPosition(0)
      break
    case 3:
      this.pstate.updateValue(2, null)
      break
  }
}

HomeMaticHomeKitBlindService.prototype.guessTargetPosition = function (value) {
  // Only update Target position if it has not been set via homekit (see targetPos.on('set'))
  if (this.targetLevel === undefined) {
    this.targetPos.updateValue(value, null)
  }
}

HomeMaticHomeKitBlindService.prototype.updateObstruction = function (value) {
  this.inhibit = value
  this.obstruction.updateValue(value, null)
}

module.exports = HomeMaticHomeKitBlindService
