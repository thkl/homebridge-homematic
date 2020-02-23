'use strict'

const assert = require('assert')
const log = require('./logger')._system
const path = require('path')
const fs = require('fs')
const Characteristic = require('./characteristic-mock').Characteristic
const Service = require('./service-mock').Service

const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  let datapath = path.join(__dirname, 'data', 'data_test_smokedetector.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)

  before(function () {
    log.debug('Init Platform with NonIp SmokeDetector')
    platform.homebridge.fireHomeBridgeEvent('didFinishLaunching')
    platform.xmlrpc.interface = 'BidCos-RF.'
    platform.homebridge.accessories(function (acc) {
      that.accessories = acc
    })
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.appliance.shutdown()
    })
  })

  describe('Homebridge Platform NonIP SmokeDetector Service Test', function () {
    it('check accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      that.accessories[0].memyselfandi = false
      done()
    })

    it('test SmokeDetector Alarm', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ADR1234567890:1', 'STATE', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.SmokeSensor)
        assert.ok(s, 'Service.SmokeSensor not found in SmokeDetector %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.SmokeDetected)
        assert.ok(cc, 'Characteristic.SmokeDetected not found in SmokeDetector %s', ac.name)
        // EventLogic
        cc.getValue(function (context, value) {
          assert.strict.equal(value, true, 'event logic result should be true is ' + value)
        })
        // Getlogic
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 1, 'get logic result should be true is ' + result)
        })
      })
      done()
    })

    it('test SmokeDetector Idle', function (done) {
      // Switch Off
      platform.xmlrpc.event(['BidCos-RF', 'ADR1234567890:1', 'STATE', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.SmokeSensor)
        assert.ok(s, 'Service.SmokeSensor not found in SmokeDetector %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.SmokeDetected)
        assert.ok(cc, 'Characteristic.SmokeDetected not found in SmokeDetector %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, false, 'event logic result should be false')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 0, 'get logic result should be false')
        })
      })
      done()
    })
  })
})
