'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitSecuritySystem (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitSecuritySystem.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitSecuritySystem, HomeKitGenericService)

HomeMaticHomeKitSecuritySystem.prototype.propagateServices = function (homebridge, Service, Characteristic) {

  // Register new Characteristic or Services here

}

HomeMaticHomeKitSecuritySystem.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  // Fill Servicelogic here
  var secsys = new Service['SecuritySystem'](this.name)
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
  this.log.debug(JSON.stringify(this.characteristics))

  // Characteristic.SecuritySystemCurrentState and Characteristic.SecuritySystemTargetState

  this.currentState = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)

    .on('set', function (value, callback) {
      // nothing to do
      if (callback) {
        callback()
      }
    })

    .on('get', function (callback) {
      that.query('4.ARMSTATE', function (value) {
        var hkValue = 0
        // have to set target state also
        that.internalsirupdate = true
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

        that.internalsirupdate = false
        if (callback) {
          callback(null, hkValue)
        }
      })
    })

  this.targetState = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)

    .on('get', function (callback) {
      that.query('4.ARMSTATE', function (value) {
        var hkTValue = 0
        switch (parseInt(value)) {
          case 3:
            hkTValue = that.characteristics['T_DISARM']
            break
          case 1:
            hkTValue = that.characteristics['T_NIGHT_ARM']
            break
          case 2:
            hkTValue = that.characteristics['T_AWAY_ARM']
            break
          case 0:
            hkTValue = that.characteristics['T_STAY_ARM']
            break
        }
        if (callback) {
          callback(null, hkTValue)
        }
      })
    })

    .on('set', function (value, callback) {
      if (that.internalsirupdate === false) {
        var hmvalue = -1
        that.log.debug('Security System value change %s', value)
        switch (parseInt(value)) {
          case Characteristic.SecuritySystemTargetState.STAY_ARM:
            that.log.info('DISARMED send 0')
            hmvalue = 0
            break

          case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
            that.log.info('NIGHT_ARM send 1')
            hmvalue = 1
            break

          case Characteristic.SecuritySystemTargetState.AWAY_ARM:
            that.log.info('AWAY_ARM send 2')
            hmvalue = 2
            break

          case Characteristic.SecuritySystemTargetState.DISARM:
            that.log.info('STAY_ARM send 3')
            hmvalue = 3
            break
        }

        if (hmvalue !== -1) {
          that.command('set', '4.ARMSTATE', hmvalue, function () {
            setTimeout(function () {
              // wait for 1 second
              that.remoteGetValue('4.ARMSTATE', function (value) {
                that.log.debug('Response current state is %s', value)
                switch (parseInt(value)) {
                  case 3:
                    that.currentState.setValue(Characteristic.SecuritySystemCurrentState.DISARMED, null)
                    break
                  case 1:
                    that.currentState.setValue(Characteristic.SecuritySystemCurrentState.NIGHT_ARM, null)
                    break
                  case 2:
                    that.currentState.setValue(Characteristic.SecuritySystemCurrentState.AWAY_ARM, null)
                    break
                  case 0:
                    that.currentState.setValue(Characteristic.SecuritySystemCurrentState.STAY_ARM, null)
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
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))
  this.log.debug('[HKSS] initial query')
  this.remoteGetValue('4.ARMSTATE', function (newValue) {
    that.log.debug('[HKSS] initial query result %s', newValue)
    that.datapointEvent('ARMSTATE', newValue)
  })
}

HomeMaticHomeKitSecuritySystem.prototype.endWorking = function () {
  this.remoteGetValue('4.ARMSTATE')
}

HomeMaticHomeKitSecuritySystem.prototype.datapointEvent = function (dp, newValue) {
  this.log.debug('[HKSS] datapointEvent %s with %s', dp, newValue)
  if ((dp === '1.STATE') || (dp === '2.STATE') || (dp === '3.STATE')) {
    if (newValue === true) {
      this.currentState.setValue(4, null)
    }
  }

  if (this.isDataPointEvent(dp, 'ARMSTATE')) {
    this.internalsirupdate = true
    var cS
    var tS
    switch (parseInt(newValue)) {
      case 0:
        cS = this.characteristics['C_STAY_ARM']
        tS = this.characteristics['T_STAY_ARM']
        break
      case 1:
        cS = this.characteristics['C_NIGHT_ARM']
        tS = this.characteristics['T_NIGHT_ARM']
        break
      case 2:
        cS = this.characteristics['C_AWAY_ARM']
        tS = this.characteristics['T_AWAY_ARM']
        break
      case 3:
        cS = this.characteristics['C_DISARMED']
        tS = this.characteristics['T_DISARM']
        break
      default:
        this.log.warn('Unsupported ARMSTATE %s', newValue)
        break
    }
    this.currentState.setValue(cS, null)
    this.targetState.setValue(tS, null)
    this.internalsirupdate = false
  }
}

module.exports = HomeMaticHomeKitSecuritySystem
