'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
class HomeMaticHomeKitSecuritySystem extends HomeKitGenericService {
  createDeviceService(Service, Characteristic) {
    var self = this
    // Fill Servicelogic here
    var secsys = this.getService(Service.SecuritySystem)
    this.services.push(secsys)
    this.internalsirupdate = false

    this.characteristics = {
      'C_DISARMED': Characteristic.SecuritySystemCurrentState.DISARMED,
      'C_NIGHT_ARM': Characteristic.SecuritySystemCurrentState.NIGHT_ARM,
      'C_AWAY_ARM': Characteristic.SecuritySystemCurrentState.AWAY_ARM,
      'C_STAY_ARM': Characteristic.SecuritySystemCurrentState.STAY_ARM,

      'T_DISARM': Characteristic.SecuritySystemTargetState.DISARM,
      'T_NIGHT_ARM': Characteristic.SecuritySystemTargetState.NIGHT_ARM,
      'T_AWAY_ARM': Characteristic.SecuritySystemTargetState.AWAY_ARM,
      'T_STAY_ARM': Characteristic.SecuritySystemTargetState.STAY_ARM

    }

    /* CCU Values

                                      0 = Off
                                      1 = int
                                      2 = ext
                                      3 = off / blocked
                                      */
    // Characteristic.SecuritySystemCurrentState and Characteristic.SecuritySystemTargetState

    this.currentState = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)

      .on('set', function (value, callback) {
        // nothing to do
        if (callback) {
          callback()
        }
      })

      .on('get', function (callback) {
        self.query('4.ARMSTATE', function (value) {
          var hkValue = 0
          // have to set target state also
          self.internalsirupdate = true
          switch (parseInt(value)) {
            case 0:
              hkValue = Characteristic.SecuritySystemCurrentState.STAY_ARM
              break
            case 1:
              hkValue = Characteristic.SecuritySystemCurrentState.NIGHT_ARM
              break
            case 2:
              hkValue = Characteristic.SecuritySystemCurrentState.AWAY_ARM
              break
            case 3:
              hkValue = Characteristic.SecuritySystemCurrentState.DISARM
              break
          }

          self.internalsirupdate = false
          if (callback) {
            callback(null, hkValue)
          }
        })
      })

    this.targetState = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)

      .on('get', function (callback) {
        self.query('4.ARMSTATE', function (value) {
          var hkTValue = 0
          switch (parseInt(value)) {
            case 3:
              hkTValue = self.characteristics['T_DISARM']
              break
            case 1:
              hkTValue = self.characteristics['T_NIGHT_ARM']
              break
            case 2:
              hkTValue = self.characteristics['T_AWAY_ARM']
              break
            case 0:
              hkTValue = self.characteristics['T_STAY_ARM']
              break
          }
          if (callback) {
            callback(null, hkTValue)
          }
        })
      })

      .on('set', function (value, callback) {
        if (self.internalsirupdate === false) {
          var hmvalue = -1
          self.log.debug('[HKSS] Security System value change %s', value)
          switch (parseInt(value)) {
            case Characteristic.SecuritySystemTargetState.STAY_ARM:
              self.log.debug('[HKSS] DISARMED send 0')
              hmvalue = 0
              break

            case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
              self.log.debug('[HKSS] NIGHT_ARM send 1')
              hmvalue = 1
              break

            case Characteristic.SecuritySystemTargetState.AWAY_ARM:
              self.log.debug('[HKSS] AWAY_ARM send 2')
              hmvalue = 2
              break

            case Characteristic.SecuritySystemTargetState.DISARM:
              self.log.debug('[HKSS] STAY_ARM send 3')
              hmvalue = 3
              break
          }

          if (hmvalue !== -1) {
            self.command('set', '4.ARMSTATE', hmvalue, function () {
              setTimeout(function () {
                // wait for 1 second
                self.remoteGetValue('4.ARMSTATE', function (value) {
                  self.log.debug('[HKSS] Response current state is %s', value)
                  switch (parseInt(value)) {
                    case 3:
                      self.currentState.setValue(Characteristic.SecuritySystemCurrentState.DISARMED, null)
                      break
                    case 1:
                      self.currentState.setValue(Characteristic.SecuritySystemCurrentState.NIGHT_ARM, null)
                      break
                    case 2:
                      self.currentState.setValue(Characteristic.SecuritySystemCurrentState.AWAY_ARM, null)
                      break
                    case 0:
                      self.currentState.setValue(Characteristic.SecuritySystemCurrentState.STAY_ARM, null)
                      break
                  }
                })
              }, 1000)
            })
          }
        }

        if (callback) callback()
      })

    this.addTamperedCharacteristic(secsys, Characteristic)
    this.addLowBatCharacteristic(secsys, Characteristic)
    this.deviceaddress = this.address.slice(0, this.address.indexOf(':'))

    this.log.debug('[HKSS] initial query')

    // Register 3 Alarm Datapoints
    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('1.STATE'), self, function (newValue) {
      if (self.isTrue(newValue)) {
        self.currentState.setValue(4, null)
      } else {
        self.currentState.setValue(self.systemCurrentState, null)
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('2.STATE'), self, function (newValue) {
      if (self.isTrue(newValue)) {
        self.currentState.setValue(4, null)
      } else {
        self.currentState.setValue(self.systemCurrentState, null)
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('3.STATE'), self, function (newValue) {
      if (self.isTrue(newValue)) {
        self.currentState.setValue(4, null)
      } else {
        self.currentState.setValue(self.systemCurrentState, null)
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('4.ARMSTATE'), self, function (newValue) {
      self.log.debug('[HKSS] event %s', newValue)
      var cS
      var tS
      switch (parseInt(newValue)) {
        case 0:
          cS = self.characteristics['C_STAY_ARM']
          tS = self.characteristics['T_STAY_ARM']
          break
        case 1:
          cS = self.characteristics['C_NIGHT_ARM']
          tS = self.characteristics['T_NIGHT_ARM']
          break
        case 2:
          cS = self.characteristics['C_AWAY_ARM']
          tS = self.characteristics['T_AWAY_ARM']
          break
        case 3:
          cS = self.characteristics['C_DISARMED']
          tS = self.characteristics['T_DISARM']
          break
        default:
          self.log.warn('Unsupported ARMSTATE %s', newValue)
          break
      }
      self.systemCurrentState = cS
      self.currentState.setValue(cS, null)
      self.targetState.setValue(tS, null)
      self.internalsirupdate = false
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('4.WORKING'), self, function (newValue) {
      if (!(self.isTrue(newValue))) {
        self.remoteGetValue('4.ARMSTATE')
      }
    })
  }
}
module.exports = HomeMaticHomeKitSecuritySystem
