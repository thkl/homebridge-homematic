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

HomeMaticHomeKitSecuritySystem.prototype.mapState = function (newState) {
  switch (newState) {
    case 0:
      this.currentStateValue = 0
      break
    case 1:
      this.currentStateValue = 2
      break
    case 2:
      this.currentStateValue = 1
      break
    case 3:
      this.currentStateValue = 3
      break
  }
}

HomeMaticHomeKitSecuritySystem.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  // Fill Servicelogic here
  var secsys = new Service['SecuritySystem'](this.name)
  this.services.push(secsys)
  this.internalsirupdate = false
  this.currentStateValue = 0

  // Characteristic.SecuritySystemCurrentState and Characteristic.SecuritySystemTargetState

  var currentState = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)

    .on('set', function (value, callback) {
      if (callback) callback()
    })

    .on('get', function (callback) {
      that.query('4:ARMSTATE', function (value) {
        that.log.debug('ssc call ccu returns %s', value)
        that.mapState(value)
        if (callback) {
          that.log.debug('ssc call homekit return %s', that.currentStateValue)
          callback(null, that.currentStateValue)
          that.lastSendValue = that.currentStateValue
        }
      })
    })

  this.currentStateCharacteristic['4:ARMSTATE'] = currentState

  var ts = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)

    .on('get', function (callback) {
      that.internalsirupdate = true
      that.remoteGetValue('4:ARMSTATE', function (value) {
        that.log.debug('sst call ccu returns %s', value)
        that.mapState(value)
        if (callback) {
          that.log.debug('sst call homekit return %s', that.currentStateValue)
          callback(null, that.currentStateValue)
          that.lastSendValue = that.currentStateValue
        }
        that.internalsirupdate = false
      })
    })

    .on('set', function (value, callback) {
      var hmvalue = -1
      if (value === 3) { hmvalue = 3 }
      if (value === 2) { hmvalue = 1 }
      if (value === 1) { hmvalue = 2 }
      if (value === 0) { hmvalue = 0 }

      if (hmvalue !== -1) {
        that.command('set', '4:ARMSTATE', hmvalue, function () {
          that.remoteGetValue('4:ARMSTATE', function (rvalue) {
            that.mapState(rvalue)
            if (that.lastSendValue !== that.currentStateValue) {
              var ts = that.currentStateCharacteristic['TARGET']
              var cs = that.currentStateCharacteristic['4:ARMSTATE']
              cs.updateValue(that.currentStateValue, null)
              ts.updateValue(that.currentStateValue, null)
              that.lastSendValue = that.currentStateValue
            }
          })
        })
      }
      if (callback) callback()
    })

  this.currentStateCharacteristic['TARGET'] = ts
  this.currentStateCharacteristic['CURRENT'] = currentState

  // this.addTamperedCharacteristic(secsys,Characteristic);
  this.addLowBatCharacteristic(secsys, Characteristic)

  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))

  // Get Initial Value
  this.remoteGetValue('4:ARMSTATE', function (value) {
    that.mapState(value)
    if (that.lastSendValue !== that.currentStateValue) {
      var ts = that.currentStateCharacteristic['TARGET']
      var cs = that.currentStateCharacteristic['4:ARMSTATE']
      cs.updateValue(that.currentStateValue, null)
      ts.updateValue(that.currentStateValue, null)
      that.lastSendValue = that.currentStateValue
    }
  })
}

HomeMaticHomeKitSecuritySystem.prototype.endWorking = function () {
  var that = this
  this.remoteGetValue('4:ARMSTATE', function (value) {
    that.mapState(value)
    if (that.lastSendValue !== that.currentStateValue) {
      var ts = that.currentStateCharacteristic['TARGET']
      var cs = that.currentStateCharacteristic['4:ARMSTATE']
      cs.updateValue(that.currentStateValue, null)
      ts.updateValue(that.currentStateValue, null)
      that.lastSendValue = that.currentStateValue
    }
  })
}

HomeMaticHomeKitSecuritySystem.prototype.datapointEvent = function (dp, newValue) {
  if ((dp === '1:STATE') || (dp === '2:STATE') || (dp === '3:STATE')) {
    if (newValue === true) {
      var cs = this.currentStateCharacteristic['4:ARMSTATE']
      cs.updateValue(4, null)
    }
  }

  if (dp === '4:ARMSTATE') {
    var that = this
    setTimeout(function () {
      that.remoteGetValue('4:ARMSTATE', function (value) {
        that.mapState(value)
        if (that.lastSendValue !== that.currentStateValue) {
          var ts = that.currentStateCharacteristic['TARGET']
          var cs = that.currentStateCharacteristic['4:ARMSTATE']
          cs.updateValue(that.currentStateValue, null)
          ts.updateValue(that.currentStateValue, null)
          that.lastSendValue = that.currentStateValue
        }
      })
    }, 1000)
  }
}

module.exports = HomeMaticHomeKitSecuritySystem
