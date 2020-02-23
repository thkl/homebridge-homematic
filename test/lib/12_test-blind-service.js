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
  let datapath = path.join(__dirname, 'data', 'data_test_blind.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data, 'HM-LC-Bl1-SM:BLIND': { 'observeInhibit': true } }
  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)

  before(function () {
    log.debug('Init Platform with Blind')
    platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.LEVEL', 0.7)
    platform.homebridge.fireHomeBridgeEvent('didFinishLaunching')
    platform.homebridge.accessories(function (acc) {
      that.accessories = acc
    })
    // reset

    platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'INHIBIT', false])
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.appliance.shutdown()
    })
  })

  describe('Homebridge Platform Blind Service Test', function () {
    it('check accessory build', function (done) {
      let cn = that.accessories[0].appliance.serviceClassName
      assert.strict.equal(cn, 'HomeMaticHomeKitBlindService')
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('initial value test', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        let ccp = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(ccp, 'Characteristic.CurrentPosition not found in Blind %s', ac.name)
        ccp.getValue(function (context, value) {
          assert.strict.equal(value, 70)
        })

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        ctp.getValue(function (context, value) {
          assert.strict.equal(value, 70)
        })
      })
      done()
    })

    it('event test blind move to 0%', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'LEVEL', 0])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'DIRECTION', 2]) // set direction to down cause the initial position was 75%
      that.accessories.map(ac => {
        let s = ac.getService(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        let ccp = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(ccp, 'Characteristic.CurrentPosition not found in Blind %s', ac.name)
        ccp.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'CurrentPosition should be 0 is ' + value)
        })

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        ctp.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'TargetPosition should be 0 is ' + value)
        })
      })
      done()
    })

    it('event test blind move to 100%', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'LEVEL', 1])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'DIRECTION', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        let ccp = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(ccp, 'Characteristic.CurrentPosition not found in Blind %s', ac.name)
        ccp.getValue(function (context, value) {
          assert.strict.equal(value, 100)
        })

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        ctp.getValue(function (context, value) {
          assert.strict.equal(value, 100)
        })
      })
      done()
    })

    it('set test blind move to 50%', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ctp, 'Characteristic.TargetPosition not found in Blind %s', ac.name)
        // Set Delay to 0 sec for use with tests
        ac.appliance.delayOnSet = 0
        ctp.emit('set', 50, function () {
          let res = platform.homebridge.getCCUDummyValue('BidCos-RF.ABC1234560:1.LEVEL')
          assert.strict.equal(res, 0.5)
        })
      })
      done()
    })

    it('set test blind inhibit', function (done) {
      // first set to 0
      platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.LEVEL', 0)
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'LEVEL', 0])
      // then lock
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'INHIBIT', true])

      that.accessories.map(ac => {
        assert.strict.equal(ac.appliance.inhibit, true, 'Inhibit event but state not in sync')

        let s = ac.getService(Service.WindowCovering)
        assert.ok(s, 'Service.WindowCovering not found in Blind %s', ac.name)
        // Check ObstructionDetected Characteristic
        let co = s.getCharacteristic(Characteristic.ObstructionDetected)
        assert.ok(co, 'Characteristic.ObstructionDetected not found in Blind %s', ac.name)
        co.getValue(function (context, value) {
          assert.strict.equal(value, true)
        })

        let ctp = s.getCharacteristic(Characteristic.TargetPosition)
        // send HomeKit event
        ctp.emit('set', 50, function () {
          let res = platform.homebridge.getCCUDummyValue('BidCos-RF.ABC1234560:1.LEVEL')
          assert.strict.equal(res, 0, 'Blind was moved but set to inhibit')
        })
      })
      done()
    })
  })
})
