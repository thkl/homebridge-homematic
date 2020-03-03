'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const sprintf = require('sprintf-js').sprintf

class HomeMaticHomeKitAlarmSystemService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var trigger = this.getClazzConfigValue('trigger', undefined)
    this.variable = this.getClazzConfigValue('variable', undefined)
    this.secState = 0

    if ((trigger !== undefined) && (this.variable !== undefined)) {
      this.log.debug('Initialize variable based SecuritySystem on %s with trigger %s', this.variable, trigger)
      var secsys = this.getService(Service.SecuritySystem)

      this.currentState = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)
        .on('set', function (value, callback) {
          if (callback) callback()
        })
        .on('get', function (callback) {
          if (callback) {
            callback(null, self.secState)
          }
        })

      this.targetState = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)
        .on('set', function (value, callback) {
          // SetVariable
          let script = sprintf("dom.GetObject('%s').State(%s);Write(dom.GetObject('%s').State());", this.variable, value, this.variable)
          this.command('sendregacommand', '', script, function (result) {
            self.secState = result
            // result will be the new state
            self.currentState.updateValue(self.secState, null)
          })
          if (callback) callback()
        }.bind(this))
        .on('get', function (callback) {
          if (callback) {
            callback(null, self.secState)
          }
        })

      // register for events at the trigger
      this.platform.registeraddressForEventProcessingAtAccessory(trigger, this, function (newValue) {
        // just reload the variable
        self.reloadState()
      })
    } else {
      this.log.warn('cannot initialize variable based SecuritySystem trigger and/or variable missed in config')
    }
  }

  /**
  * Reload the variable state and set target and current state
  *
  * Characteristic.SecuritySystemCurrentState.STAY_ARM = 0;
  * Characteristic.SecuritySystemCurrentState.AWAY_ARM = 1;
  * Characteristic.SecuritySystemCurrentState.NIGHT_ARM = 2;
  * Characteristic.SecuritySystemCurrentState.DISARMED = 3;
  * Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED = 4;
  *
  *
  * Characteristic.SecuritySystemTargetState.STAY_ARM = 0;
  * Characteristic.SecuritySystemTargetState.AWAY_ARM = 1;
  * Characteristic.SecuritySystemTargetState.NIGHT_ARM = 2;
  * Characteristic.SecuritySystemTargetState.DISARM = 3;
  * @return {[type]} [description]
  */

  reloadState () {
    let self = this
    let script = sprintf("Write(dom.GetObject('%s').State());", this.variable)
    this.command('sendregacommand', '', script, function (result) {
      self.secState = result
      // Update Characteristics
      self.currentState.updateValue(self.secState, null)
      if (self.secState < 4) {
        self.targetState.updateValue(self.secState, null)
      }
    })
  }
}

module.exports = HomeMaticHomeKitAlarmSystemService
