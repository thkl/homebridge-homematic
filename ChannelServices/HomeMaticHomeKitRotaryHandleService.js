'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
const moment = require('moment')
const epoch = moment('2001-01-01T00:00:00Z').unix()
let eve

class HomeMaticHomeKitRotaryHandleService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    var self = this

    this.historyEnabled = this.getClazzConfigValue('enable_history', false)
    this.homekitType = this.getClazzConfigValue('hk_type', 'CONTACT')
    if (this.historyEnabled === true) {
      this.log.debug('[RHS] Eve History is enabled')
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
        this.log.debug('[RHS] No LastOpen - set it to just now')
      }
    }

    switch (this.homekitType) {
      case 'WINDOW':
        this.log.debug('[RHS] Generate Window Service')
        this.generateWindowService(Service, Characteristic)
        break
      case 'DOOR':
        this.log.debug('[RHS] Generate Door Service')
        this.generateDoorService(Service, Characteristic)
        break
      default:
        this.log.debug('[RHS] Generate Contact Service')
        this.generateContactService(Service, Characteristic)
        break
    }

    let dpa = this.transformDatapoint('STATE')
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, self, function (newValue) {
      self.log.debug('[RHS] event %s', newValue)
      self.processWindowSensorData(newValue)
    })
  }

  generateDoorService (Service, Characteristic) {
    let self = this
    var door = this.getService(Service.Door)
    this.cdoor = door.getCharacteristic(Characteristic.CurrentPosition)
    this.cdoor.on('get', function (callback) {
      self.query('STATE', function (value) {
        if (callback) {
          switch (parseInt(value)) {
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
    if (this.historyEnabled === true) {
      this.addEveStuff(window)
    }
  }

  generateContactService (Service, Characteristic) {
    let self = this
    var contact = this.getService(Service.ContactSensor)
    this.ccontact = contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (callback) {
            let result = false
            switch (parseInt(value)) {
              case 0:
                result = false
                break
              case 1:
                result = true
                break
              case 2:
                result = true
                break
              default:
                result = false
            }
            self.log.debug('[RHS] Query HM result is %s return %s (%s)', value, result, typeof value)
            callback(null, result)
          }
        })
      })
    contact.getCharacteristic(Characteristic.StatusActive)
      .on('get', function (callback) {
        callback(null, true)
      })
    contact.getCharacteristic(Characteristic.StatusActive).setValue(true)

    this.ccontact.eventEnabled = true
    this.addTamperedCharacteristic(contact, Characteristic)
    this.addLowBatCharacteristic(contact, Characteristic)
    if (this.historyEnabled === true) {
      this.addEveStuff(contact)
    }
  }

  generateWindowService (Service, Characteristic) {
    let self = this
    var window = this.getService(Service.Window)
    this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition)
    this.cwindow.on('get', function (callback) {
      self.query('STATE', function (value) {
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
        self.remoteGetValue('STATE', function (value) {
          self.processWindowSensorData(value)
        })
      }, 1000)

      if (callback) {
        callback()
      }
    })

      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (callback) {
            switch (parseInt(value)) {
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
    if (this.historyEnabled === true) {
      this.addEveStuff(window)
    }
  }

  addEveStuff (device) {
    let self = this
    device.addOptionalCharacteristic(eve.Characteristic.TimesOpened)
    device.addOptionalCharacteristic(eve.Characteristic.OpenDuration)
    device.addOptionalCharacteristic(eve.Characteristic.ClosedDuration)
    device.addOptionalCharacteristic(eve.Characteristic.LastActivation)
    this.addLoggingCharacteristic(eve.Characteristic.ResetTotal)

    var rt = this.getLoggingCharacteristic(eve.Characteristic.ResetTotal)
    if (rt !== undefined) {
      rt.on('set', function (value, callback) {
        // only reset if its not equal the reset time we know
        if (value !== self.lastReset) {
          self.log.debug('[RHS] set ResetTotal called %s != last reset so do a reset', value)
          self.timesOpened = 0
          self.lastReset = value
          self.setPersistentState('timesOpened', self.timesOpened)
          this.setPersistentState('lastReset', self.lastReset)

          if (self.CharacteristicTimesOpened) {
            self.CharacteristicTimesOpened.updateValue(self.timesOpened, null)
          }
        } else {
          self.log.debug('[RHS] set ResetTotal called %s its equal the last reset time so ignore', value)
        }
        if (callback) {
          callback()
        }
      }.bind(this))

        .on('get', function (callback) {
          self.log.debug('[RHS] get ResetTotal called %s', self.lastReset)
          callback(null, self.lastReset)
        })

      rt.setValue(this.lastReset)
    }

    this.CharacteristicOpenDuration = device.getCharacteristic(eve.Characteristic.OpenDuration)
      .on('get', function (callback) {
        self.log.debug('[RHS] getOpenDuration')
        callback(null, self.timeOpen)
      })
    this.CharacteristicOpenDuration.setValue(0)

    this.CharacteristicClosedDuration = device.getCharacteristic(eve.Characteristic.ClosedDuration)
      .on('get', function (callback) {
        self.log.debug('[RHS] getClosedDuration')
        callback(null, self.timeClosed)
      })
    this.CharacteristicClosedDuration.setValue(0)

    this.CharacteristicLastOpen = device.getCharacteristic(eve.Characteristic.LastActivation)
      .on('get', function (callback) {
        self.log.debug('[RHS] getLastOpen will report %s', self.lastOpen)
        callback(null, self.lastOpen)
      })
    this.CharacteristicLastOpen.setValue(this.lastOpen)

    this.CharacteristicTimesOpened = device.getCharacteristic(eve.Characteristic.TimesOpened)
      .on('get', function (callback) {
        self.log.debug('[RHS] getTimesOpened will report %s', self.timesOpened)
        callback(null, self.timesOpened)
      })
    this.CharacteristicTimesOpened.setValue(this.timesOpened)
  }

  processWindowSensorData (newValue) {
    this.log.debug('[RHS] processing Data %s (%s)', newValue, typeof newValue)
    if (this.homekitType === 'WINDOW') {
      if (this.haz([this.cwindow, this.swindow, this.twindow])) {
        switch (parseInt(newValue)) {
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

    if (this.homekitType === 'DOOR') {
      if (this.haz([this.cdoor])) {
        switch (parseInt(newValue)) {
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
        switch (parseInt(newValue)) {
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

    if (this.historyEnabled === true) {
      this.log.debug('[RHS] add new log entry')
      this.addLogEntry({
        status: (parseInt(newValue) > 0) ? 1 : 0
      })
      let now = moment().unix()
      if (parseInt(newValue) > 0) {
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
  }
}

module.exports = HomeMaticHomeKitRotaryHandleService
