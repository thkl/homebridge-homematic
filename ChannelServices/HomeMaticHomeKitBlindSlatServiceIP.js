'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitBlindSlatServiceIP (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitBlindSlatServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitBlindSlatServiceIP, HomeKitGenericService)

HomeMaticHomeKitBlindSlatServiceIP.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var blind = new Service.WindowCovering(this.name)
  this.services.push(blind)

  this.currentPos = blind.getCharacteristic(Characteristic.CurrentPosition)

    .on('get', function (callback) {
      that.log.info('get CurrentPosition')
      that.query('4:LEVEL', function (value) {
        that.log.info('get CurrentPosition return %s', value)
        if (callback) callback(null, value)
      })
    })

  this.setCurrentStateCharacteristic('LEVEL', this.currentPos)
  this.currentPos.eventEnabled = true

  this.targetPos = blind.getCharacteristic(Characteristic.TargetPosition)

    .on('get', function (callback) {
      that.log.info('get TargetPosition ')
      that.query('4:LEVEL', function (value) {
        that.log.info('get TargetPosition return %s', value)
        if (callback) {
          callback(null, value)
        }
      })
    })

    .on('set', function (value, callback) {
      that.delayed('set', '4:LEVEL', value, 750)
      callback()
    })

  var pstate = blind.getCharacteristic(Characteristic.PositionState)

    .on('get', function (callback) {
      that.query('DIRECTION', function (value) {
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

  this.cslat = blind.getCharacteristic(Characteristic.CurrentHorizontalTiltAngle)
    .on('get', function (callback) {
      that.query('LEVEL_2', function (value) {
        if (callback) {
          if (value !== undefined) {
            // Recalculate
            let vl = -90 + (1.8 * (value * 100))
            callback(null, vl)
          } else {
            callback(null, '0')
          }
        }
      })
    })

  this.tslat = blind.getCharacteristic(Characteristic.TargetHorizontalTiltAngle)
    .on('set', function (value, callback) {
      let nlv = (value + 90 / 100) / 1.8
      that.delayed('set', 'LEVEL_2', nlv, 750)
    })

  this.addValueMapping('DIRECTION', 0, 2)
  this.addValueMapping('DIRECTION', 1, 0)
  this.addValueMapping('DIRECTION', 2, 1)
  this.addValueMapping('DIRECTION', 3, 2)

  this.remoteGetValue('4:LEVEL')
  this.remoteGetValue('DIRECTION')

  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))
}

HomeMaticHomeKitBlindSlatServiceIP.prototype.endWorking = function () {
  this.remoteGetValue('4:LEVEL')
}

HomeMaticHomeKitBlindSlatServiceIP.prototype.datapointEvent = function (dp, newValue) {
  let that = this
  if ((dp === '4:PROCESS') && (newValue === 0)) {
    this.remoteGetValue('4:LEVEL', function (value) {
      that.currentPos.updateValue(value, null)
      that.targetPos.updateValue(value, null)
    })
  }

  if (dp === '4:LEVEL_2') {
    let vl = -90 + (1.8 * (newValue * 100))
    that.cslat.updateValue(vl, null)
    that.tslat.updateValue(vl, null)
  }
}

module.exports = HomeMaticHomeKitBlindSlatServiceIP
