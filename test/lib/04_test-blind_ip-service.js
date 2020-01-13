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
  let datapath = path.join(__dirname, 'data', 'data_test_blind_ip.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config)

  before(function () {
    log.debug('Init Platform with IP Blind')
    // Change Platform to HmIP
    platform.xmlrpc.interface = 'HmIP-RF.'
    platform.accessories(function (acc) {
      that.accessories = acc
    })
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.shutdown()
    })
  })

  describe('Homebridge Platform Blind Service Test', function () {
    it('check accessory build', function (done) {
      let cn = that.accessories[0].constructor.name
      assert.strict.equal(cn, 'HomeMaticHomeKitBlindServiceIP')
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('event test blind move to 0%', function (done) {
      // HmIP-RF.ADR1234567890
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:4', 'LEVEL', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        let ccp = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(ccp, 'Characteristic.CurrentPosition not found in Blind %s', ac.name)
        ccp.getValue(function (context, value) {
          assert.strict.equal(value, 0)
        })

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        ctp.getValue(function (context, value) {
          assert.strict.equal(value, 0)
        })
      })
      done()
    })

    it('event test blind move to 100%', function (done) {
      // HmIP-RF.ADR1234567890
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:4', 'LEVEL', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        let ccp = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(ccp, 'Characteristic.CurrentPosition not found in Blind %s', ac.name)
        ccp.getValue(function (context, value) {
          assert.strict.equal(value, 100)
        })

        ccp.emit('get', function (context, result) {
          assert.strict.equal(result, 100, 'get logic result should be 100')
        })

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        ctp.getValue(function (context, value) {
          assert.strict.equal(value, 100)
        })
        ctp.emit('get', function (context, result) {
          assert.strict.equal(result, 100, 'get logic result should be 100')
        })
      })
      done()
    })

    it('set test blind move to 50%', function (done) {
      // HmIP-RF.ADR1234567890
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        // Set Delay to 0 sec for use with tests
        ac.delayOnSet = 0
        ctp.emit('set', 50, function () {
          let res = platform.homebridge.values['HmIP-RF.ADR1234567890:4.LEVEL']
          assert.strict.equal(res, 0.5)
        })
      })
      done()
    })

    it('event on channel 3 test blind move to 25%', function (done) {
      // HmIP-RF.ADR1234567890
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:3', 'LEVEL', 0.25])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        let ccp = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(ccp, 'Characteristic.CurrentPosition not found in Blind %s', ac.name)
        ccp.getValue(function (context, value) {
          assert.strict.equal(value, 25)
        })
        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        ctp.getValue(function (context, value) {
          assert.strict.equal(value, 25)
        })
        // Note get emits will not work in simulator because set on channel 3 will not set the same value on channel 4 (there is the getter)
      })
      done()
    })
  })
})
