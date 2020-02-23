'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
const moment = require('moment')
const epoch = moment('2001-01-01T00:00:00Z').unix()
let eve

class HomeMaticHomeKitContactService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    this.enableLoggingService('door', false)
    this.isMultiChannel = false // do not run into the multichannel issue #543
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
      this.log.debug('[Contact] No LastOpen - set it to just now')
    }

    this.reverse = false
    if (this.cfg !== undefined) {
      if (this.cfg['reverse'] !== undefined) {
        this.reverse = true
      }
    }

    if (this.special === 'WINDOW') {
      this.createWindowAccessory(Service, Characteristic)
    } else

    if (this.special === 'DOOR') {
      this.createDoorAccessory(Service, Characteristic)
    } else {
      this.createContactAccessory(Service, Characteristic)
    }
  }

  createDoorAccessory (Service, Characteristic) {
    let self = this
    this.log.debug('[Contact] Creating a Door')
    var door = this.getService(Service.Door)
    this.cdoor = door.getCharacteristic(Characteristic.CurrentPosition)
    this.cdoor.on('get', function (callback) {
      self.query('STATE', function (value) {
        if (callback) callback(null, (value === true) ? 100 : 0)
      })
    })
    this.cdoor.eventEnabled = true

    this.tdoor = door.getCharacteristic(Characteristic.TargetPosition)
    this.tdoor.on('get', function (callback) {
      self.query('STATE', function (value) {
        if (callback) callback(null, (value === true) ? 100 : 0)
      })
    })

      .on('set', function (value, callback) {
        // This is just a sensor so reset homekit data to ccu value after 1 second playtime
        setTimeout(function () {
          self.remoteGetValue('STATE', function (value) {
            self.processDoorState(value)
          })
        }, 1000)

        if (callback) {
          callback()
        }
      })

    this.sdoor = door.getCharacteristic(Characteristic.PositionState)
    this.sdoor.on('get', function (callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED)
    })
    this.remoteGetValue('STATE', function (value) {
      self.processDoorState(value)
    })
  }

  createWindowAccessory (Service, Characteristic) {
    let self = this
    this.log.debug('[Contact] Creating a Window')
    var window = this.getService(Service.Window)
    this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition)
    this.cwindow.on('get', function (callback) {
      self.query('STATE', function (value) {
        if (callback) {
          var cbvalue = 0
          if (value > 0) {
            cbvalue = 100
          }
          callback(null, cbvalue)
        }
      })
    })

    this.currentStateCharacteristic['STATE'] = this.cwindow
    this.cwindow.eventEnabled = true

    this.twindow = window.getCharacteristic(Characteristic.TargetPosition)
    this.twindow.on('get', function (callback) {
      self.query('STATE', function (value) {
        if (callback) {
          var cbvalue = 0
          if (value > 0) {
            cbvalue = 100
          }
          callback(null, cbvalue)
        }
      })
    })

    this.targetCharacteristic = this.twindow

    this.addValueMapping('STATE', 0, 0)
    this.addValueMapping('STATE', 1, 100)
    this.addValueMapping('STATE', false, 0)
    this.addValueMapping('STATE', true, 100)

    this.swindow = window.getCharacteristic(Characteristic.PositionState)
    this.swindow.on('get', function (callback) {
      if (callback) callback(null, Characteristic.PositionState.STOPPED)
    })

    this.remoteGetValue('STATE', function (value) {
      self.processWindowState(value)
    })
  }

  createContactAccessory (Service, Characteristic) {
    let self = this
    this.log.debug('[Contact] Creating a ContactSensor')
    this.contact = this.getService(Service.ContactSensor)
    this.contact.addOptionalCharacteristic(eve.Characteristic.TimesOpened)
    this.contact.addOptionalCharacteristic(eve.Characteristic.OpenDuration)
    this.contact.addOptionalCharacteristic(eve.Characteristic.ClosedDuration)
    this.contact.addOptionalCharacteristic(eve.Characteristic.LastActivation)
    this.addLoggingCharacteristic(eve.Characteristic.ResetTotal)

    var rt = this.getLoggingCharacteristic(eve.Characteristic.ResetTotal)
    if (rt !== undefined) {
      rt.on('set', function (value, callback) {
        // only reset if its not equal the reset time we know
        if (value !== self.lastReset) {
          self.log.debug('[Contact] set ResetTotal called %s != last reset so do a reset', value)
          self.timesOpened = 0
          self.lastReset = value
          self.setPersistentState('timesOpened', self.timesOpened)
          this.setPersistentState('lastReset', self.lastReset)

          if (self.CharacteristicTimesOpened) {
            self.CharacteristicTimesOpened.updateValue(self.timesOpened, null)
          }
        } else {
          self.log.debug('[Contact] set ResetTotal called %s its equal the last reset time so ignore', value)
        }
        if (callback) {
          callback()
        }
      }.bind(this))

        .on('get', function (callback) {
          self.log.debug('[Contact] get ResetTotal called %s', self.lastReset)
          callback(null, self.lastReset)
        })

      rt.setValue(this.lastReset)
    }

    this.contact.getCharacteristic(Characteristic.StatusActive)
      .on('get', function (callback) {
        callback(null, true)
      })
    this.contact.getCharacteristic(Characteristic.StatusActive).setValue(true)

    this.CharacteristicOpenDuration = this.contact.getCharacteristic(eve.Characteristic.OpenDuration)
      .on('get', function (callback) {
        self.log.debug('[Contact] getOpenDuration')
        callback(null, self.timeOpen)
      })
    this.CharacteristicOpenDuration.setValue(0)

    this.CharacteristicClosedDuration = this.contact.getCharacteristic(eve.Characteristic.ClosedDuration)
      .on('get', function (callback) {
        self.log.debug('[Contact] getClosedDuration')
        callback(null, self.timeClosed)
      })
    this.CharacteristicClosedDuration.setValue(0)

    this.CharacteristicLastOpen = this.contact.getCharacteristic(eve.Characteristic.LastActivation)
      .on('get', function (callback) {
        self.log.debug('[Contact] getLastOpen will report %s', self.lastOpen)
        callback(null, self.lastOpen)
      })
    this.CharacteristicLastOpen.setValue(this.lastOpen)

    this.CharacteristicTimesOpened = this.contact.getCharacteristic(eve.Characteristic.TimesOpened)
      .on('get', function (callback) {
        self.log.debug('[Contact] getTimesOpened will report %s', self.timesOpened)
        callback(null, self.timesOpened)
      })
    this.CharacteristicTimesOpened.setValue(this.timesOpened)

    this.contactstate = this.contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (self.reverse === true) {
            self.log.debug('[Contact] Reverse mode %s', value)
          } else {
            self.log.debug('[Contact] normal mode %s', value)
          }

          callback(null, value)
        })
      })

    this.contactstate.eventEnabled = true
    this.log.debug('[Contact] Initial Query for Contact')

    this.remoteGetValue('STATE', function (value) {
      self.processContactState(value)
    })
  }

  stateCharacteristicDidChange (characteristic, newValue) {
    if (characteristic.displayName === '[Contact] Current Position') {
      // Set Target
      if (this.targetCharacteristic) {
        this.targetCharacteristic.setValue(newValue, null)
      }
    }
  }

  processContactState (newValue) {
    var result = 0
    if (this.contactstate !== undefined) {
      if (this.reverse === true) {
        result = !(this.isTrue(newValue))
      } else {
        result = this.isTrue(newValue)
      }
      this.log.debug('[Contact] Update Contact State to %s', result)
      this.contactstate.updateValue(result, null)
    }
  }

  processDoorState (newValue) {
    this.log.debug('[Contact] Update Door State')

    if (this.haz([this.cdoor, this.tdoor, this.sdoor])) {
      switch (newValue) {
        case false:
          this.cdoor.updateValue(0, null)
          this.tdoor.updateValue(0, null)
          this.sdoor.updateValue(2, null)
          break
        case true:
          this.cdoor.updateValue(100, null)
          this.tdoor.updateValue(100, null)
          this.sdoor.updateValue(2, null)
          break
      }
    }
  }

  processWindowState (newValue) {
    if (this.haz([this.cwindow, this.twindow, this.swindow])) {
      switch (newValue) {
        case false:
          this.cwindow.updateValue(0, null)
          this.twindow.updateValue(0, null)
          this.swindow.updateValue(2, null)
          break
        case true:
          this.cwindow.updateValue(100, null)
          this.twindow.updateValue(100, null)
          this.swindow.updateValue(2, null)
          break
      }
    } else {
      this.log.info("[Contact] Something's missing")
    }
  }

  datapointEvent (dp, newValue, channel) {
    if (this.isDataPointEvent(dp, 'STATE')) {
      this.addLogEntry({
        status: (newValue === true) ? 1 : 0
      })
      if (this.special === 'DOOR') {
        this.processDoorState(newValue)
      } else if (this.special === 'WINDOW') {
        this.processWindowState(newValue)
      } else {
        this.processContactState(newValue)
      }

      let now = moment().unix()
      if (newValue === true) {
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

  shutdown () {
    this.log.debug('[Contact] shutdown')
    super.shutdown()
  }
}
module.exports = HomeMaticHomeKitContactService
