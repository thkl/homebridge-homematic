'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var EveHomeKitTypes = require('./EveHomeKitTypes.js')
const moment = require('moment')
const epoch = moment('2001-01-01T00:00:00Z').unix()
let eve

function HomeMaticHomeKitRotaryHandleService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitRotaryHandleService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitRotaryHandleService, HomeKitGenericService)

HomeMaticHomeKitRotaryHandleService.prototype.propagateServices = function (homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}

HomeMaticHomeKitRotaryHandleService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.enableLoggingService('door', false)

  this.timesOpened = this.getPersistentState('timesOpened', 0)
  this.timeOpen = this.getPersistentState('timeOpen', 0)
  this.timeClosed = this.getPersistentState('timeClosed', 0)
  this.timeStamp = moment().unix()

  this.lastReset = this.getPersistentState('lastReset', undefined)
  if (this.lastReset === undefined) {
    // Set to now
    this.lastReset = moment().unix() - epoch
    this.setPersistentState('lastReset', this.lastReset)
  }

  this.lastOpen = this.getPersistentState('lastOpen', undefined)
  if ((this.lastOpen === undefined) && (this.loggingService !== undefined)) {
    // Set to now
    this.lastOpen = moment().unix() - this.loggingService.getInitialTime()
    this.setPersistentState('lastOpen', this.lastOpen)
    this.log.debug('No LastOpen - set it to just now')
  }

  if (this.special === 'WINDOW') {
    var window = new Service.Window(this.name)
    this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition)
    this.cwindow.on('get', function (callback) {
      that.query('STATE', function (value) {
        if (callback) {
          switch (value) {
            case 0:
              callback(null, 0)
              break
            case 1:
              callback(null, 50)
              break
            case 2:
              callback(null, 100)
              break
            default:
              callback(null, 0)
          }
        }
      })
    })

    this.cwindow.eventEnabled = true

    this.twindow = window.getCharacteristic(Characteristic.TargetPosition)
    this.twindow.on('set', function (value, callback) {
      // This is just a sensor so reset homekit data to ccu value after 1 second playtime
      setTimeout(function () {
        that.remoteGetValue('STATE', function (value) {
          that.processWindowSensorData(value)
        })
      }, 1000)

      if (callback) {
        callback()
      }
    })

      .on('get', function (callback) {
        that.query('STATE', function (value) {
          if (callback) {
            switch (value) {
              case 0:
                callback(null, 0)
                break
              case 1:
                callback(null, 50)
                break
              case 2:
                callback(null, 100)
                break
              default:
                callback(null, 0)
            }
          }
        })
      })

    this.swindow = window.getCharacteristic(Characteristic.PositionState)
    this.swindow.on('get', function (callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED)
    })
    this.addEveStuff(window)
    this.services.push(window)
  } else

  if (this.special === 'DOOR') {
    var door = new Service['Door'](this.name)
    this.cdoor = door.getCharacteristic(Characteristic.CurrentPosition)
    this.cdoor.on('get', function (callback) {
      that.query('STATE', function (value) {
        if (callback) {
          switch (value) {
            case 0:
              callback(null, 0)
              break
            case 1:
              callback(null, 50)
              break
            case 2:
              callback(null, 100)
              break
            default:
              callback(null, 0)
          }
        }
      })
    })

    this.cdoor.eventEnabled = true
    this.services.push(door)
  } else {
    var contact = new Service.ContactSensor(this.name)
    this.ccontact = contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function (callback) {
        that.query('STATE', function (value) {
          if (callback) {
            switch (value) {
              case 0:
                callback(null, 0)
                break
              case 1:
                callback(null, 1)
                break
              case 2:
                callback(null, 1)
                break
              default:
                callback(null, 0)
            }
          }
        })
      })

    this.ccontact.eventEnabled = true
    this.addTamperedCharacteristic(contact, Characteristic)
    this.addLowBatCharacteristic(contact, Characteristic)
    this.addEveStuff(contact)
    this.services.push(contact)
  }

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':1.STATE', this)
  this.remoteGetValue('STATE', function (newValue) {
    that.processWindowSensorData(newValue)
  })
}

HomeMaticHomeKitRotaryHandleService.prototype.addEveStuff = function (device) {
  let that = this
  device.addOptionalCharacteristic(eve.Characteristic.TimesOpened)
  device.addOptionalCharacteristic(eve.Characteristic.OpenDuration)
  device.addOptionalCharacteristic(eve.Characteristic.ClosedDuration)
  device.addOptionalCharacteristic(eve.Characteristic.LastActivation)
  this.addLoggingCharacteristic(eve.Characteristic.ResetTotal)

  var rt = this.getLoggingCharacteristic(eve.Characteristic.ResetTotal)
  if (rt !== undefined) {
    rt.on('set', function (value, callback) {
      // only reset if its not equal the reset time we know
      if (value !== that.lastReset) {
        that.log.debug('set ResetTotal called %s != last reset so do a reset', value)
        that.timesOpened = 0
        that.lastReset = value
        that.setPersistentState('timesOpened', that.timesOpened)
        this.setPersistentState('lastReset', that.lastReset)

        if (that.CharacteristicTimesOpened) {
          that.CharacteristicTimesOpened.updateValue(that.timesOpened, null)
        }
      } else {
        that.log.debug('set ResetTotal called %s its equal the last reset time so ignore', value)
      }
      if (callback) {
        callback()
      }
    }.bind(this))

      .on('get', function (callback) {
        that.log.debug('get ResetTotal called %s', that.lastReset)
        callback(null, that.lastReset)
      })

    rt.setValue(this.lastReset)
  }

  this.CharacteristicOpenDuration = device.getCharacteristic(eve.Characteristic.OpenDuration)
    .on('get', function (callback) {
      that.log.debug('getOpenDuration')
      callback(null, that.timeOpen)
    })
  this.CharacteristicOpenDuration.setValue(0)

  this.CharacteristicClosedDuration = device.getCharacteristic(eve.Characteristic.ClosedDuration)
    .on('get', function (callback) {
      that.log.debug('getClosedDuration')
      callback(null, that.timeClosed)
    })
  this.CharacteristicClosedDuration.setValue(0)

  this.CharacteristicLastOpen = device.getCharacteristic(eve.Characteristic.LastActivation)
    .on('get', function (callback) {
      that.log.debug('getLastOpen will report %s', that.lastOpen)
      callback(null, that.lastOpen)
    })
  this.CharacteristicLastOpen.setValue(this.lastOpen)

  this.CharacteristicTimesOpened = device.getCharacteristic(eve.Characteristic.TimesOpened)
    .on('get', function (callback) {
      that.log.debug('getTimesOpened will report %s', that.timesOpened)
      callback(null, that.timesOpened)
    })
  this.CharacteristicTimesOpened.setValue(this.timesOpened)
}

HomeMaticHomeKitRotaryHandleService.prototype.processWindowSensorData = function (newValue) {
  if (this.special === 'WINDOW') {
    if (this.haz([this.cwindow, this.swindow, this.twindow])) {
      switch (newValue) {
        case 0:
          this.cwindow.updateValue(0, null)
          this.swindow.updateValue(2, null)
          this.twindow.updateValue(0, null)
          break
        case 1:
          this.cwindow.updateValue(50, null)
          this.swindow.updateValue(2, null)
          this.twindow.updateValue(50, null)
          break
        case 2:
          this.cwindow.updateValue(100, null)
          this.swindow.updateValue(2, null)
          this.twindow.updateValue(100, null)
          break
      }
    }
  } else

  if (this.special === 'DOOR') {
    if (this.haz([this.cdoor])) {
      switch (newValue) {
        case 0:
          this.cdoor.updateValue(0, null)
          break
        case 1:
          this.cdoor.updateValue(50, null)
          break
        case 2:
          this.cdoor.updateValue(100, null)
          break
      }
    }
  } else {
    if (this.haz([this.ccontact])) {
      switch (newValue) {
        case 0:
          this.ccontact.updateValue(0, null)
          break
        case 1:
          this.ccontact.updateValue(1, null)
          break
        case 2:
          this.ccontact.updateValue(1, null)
          break
      }
    }
  }
}

HomeMaticHomeKitRotaryHandleService.prototype.datapointEvent = function (dp, newValue) {
  // Chech sensors
  this.processWindowSensorData(newValue)
  this.addLogEntry({
    status: (newValue === 1) ? 1 : 0
  })
  let now = moment().unix()
  if (newValue === 1) {
    this.timeClosed = this.timeClosed + (moment().unix() - this.timeStamp)
    this.timesOpened = this.timesOpened + 1
    if (this.loggingService !== undefined) {
      let firstLog = this.loggingService.getInitialTime()
      this.lastOpen = moment().unix() - firstLog
      this.CharacteristicLastOpen.updateValue(this.lastOpen, null)
      this.setPersistentState('lastOpen', this.lastOpen)
    }
    this.CharacteristicTimesOpened.updateValue(this.timesOpened, null)
    this.setPersistentState('timesOpened', this.timesOpened)
  } else {
    this.timeOpen = this.timeOpen + (moment().unix() - this.timeStamp)
  }
  this.timeStamp = now
}

module.exports = HomeMaticHomeKitRotaryHandleService
