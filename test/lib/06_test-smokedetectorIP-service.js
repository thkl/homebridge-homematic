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
  let datapath = path.join(__dirname, 'data', 'data_test_smokedetectorIP.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config)

  before(function () {
    log.debug('Init Platform with IP SmokeDetector')
    platform.accessories(function (acc) {
      that.accessories = acc
    })
    platform.xmlrpc.interface = 'HmIP-RF.'
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.shutdown()
    })
  })

  describe('Homebridge Platform SmokeDetector Service Test', function () {
    it('check accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      that.accessories[0].memyselfandi = false
      done()
    })

    it('test SmokeDetector Alarm', function (done) {
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:1', 'SMOKE_DETECTOR_ALARM_STATUS', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.SmokeSensor)
        assert.ok(s, 'Service.SmokeSensor not found in SmokeDetector %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.SmokeDetected)
        assert.ok(cc, 'Characteristic.SmokeDetected not found in SmokeDetector %s', ac.name)
        // EventLogic
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 1, 'event logic result should be 1 is ' + value)
        })
        // Getlogic
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 1, 'get logic result should be 1 is ' + result)
        })
      })
      done()
    })

    it('test SmokeDetector Idle', function (done) {
      // Switch Off
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:1', 'SMOKE_DETECTOR_ALARM_STATUS', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.SmokeSensor)
        assert.ok(s, 'Service.SmokeSensor not found in SmokeDetector %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.SmokeDetected)
        assert.ok(cc, 'Characteristic.SmokeDetected not found in SmokeDetector %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'event logic result should be 0')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 0, 'get logic result should be 0')
        })
      })
      done()
    })

    it('test SmokeDetector Alarm not for me', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.SmokeSensor)
        assert.ok(s, 'Service.SmokeSensor not found in SmokeDetector %s', ac.name)
        ac.memyselfandi = true
        platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:1', 'SMOKE_DETECTOR_ALARM_STATUS', 3])
        let cc = s.getCharacteristic(Characteristic.SmokeDetected)
        assert.ok(cc, 'Characteristic.SmokeDetected not found in SmokeDetector %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'event logic result should be 0')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 0, 'get logic result should be 0')
        })
      })
      done()
    })

    it('test SmokeDetector Intrusion Alarm', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.SmokeSensor)
        assert.ok(s, 'Service.SmokeSensor not found in SmokeDetector %s', ac.name)
        ac.memyselfandi = true
        platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:1', 'SMOKE_DETECTOR_ALARM_STATUS', 2])
        let cc = s.getCharacteristic(Characteristic.SmokeDetected)
        assert.ok(cc, 'Characteristic.SmokeDetected not found in SmokeDetector %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 1, 'event logic result should be 1')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 1, 'get logic result should be 1')
        })
      })
      done()
    })
  })
})
