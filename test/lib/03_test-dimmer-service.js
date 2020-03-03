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
  let datapath = path.join(__dirname, 'data', 'data_test_dimmer.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {
    ccu_ip: '127.0.0.1',
    subsection: 'HomeKit',
    testdata: data
  }

  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)
  this.randomInitValue = Math.random()
  this.expInitValue = (that.randomInitValue * 100)

  before(function () {
    platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.LEVEL', that.randomInitValue)
    log.debug('Init Platform with Switch')
    platform.homebridge.fireHomeBridgeEvent('didFinishLaunching')
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

  describe('Homebridge Platform Dimmer Service Test', function () {
    this.timeout(2000)

    it('check accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 3)
      done()
    })

    it('test initial values dimmer must be random', function (done) {
      let ac = that.accessories[0]
      let s = ac.getService(Service.Lightbulb)
      assert.ok(s, 'Service.Lightbulb not found in %s', ac.name)
      let cc = s.getCharacteristic(Characteristic.On)
      assert.ok(cc, 'Characteristic.On not found in %s', ac.name)
      cc.getValue(function (context, value) {
        assert.strict.equal(value, true, 'Dimmer must be on (true)')
      })
      let cb = s.getCharacteristic(Characteristic.Brightness)
      assert.ok(cb, 'Characteristic.Brightness not found in %s', ac.name)
      cb.getValue(function (context, value) {
        assert.strict.equal(value, that.expInitValue, 'Dimmer Level must be ' + that.expInitValue + '%')
      })
      // Reset Value
      platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.LEVEL', 0)
      done()
    })

    it('test Dimmer service Level 100%', function (done) {
      // send BidCos-RF.ABC1234560:1.STATE a on Message
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'LEVEL', 1])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'LEVEL', 1])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:3', 'LEVEL', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testdimmer %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testdimmer %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, true, 'Dimmer set to 100% On should be true')
        })

        let cl = s.getCharacteristic(Characteristic.Brightness)
        assert.ok(cl, 'Characteristic.Brightness not found in testdimmer %s', ac.name)
        cl.getValue(function (context, value) {
          assert.strict.equal(value, 100)
        })

        cl.emit('get', function (context, result) {
          assert.strict.equal(result, 100, 'get logic result should be 100')
        })
      })
      done()
    })

    it('test Dimmer service Level 0%', function (done) {
      // Switch Off
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'LEVEL', 0])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'LEVEL', 0])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:3', 'LEVEL', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testdimmer %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testdimmer %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, false, 'Dimmer set to 0% On should be true')
        })

        let cl = s.getCharacteristic(Characteristic.Brightness)
        assert.ok(cl, 'Characteristic.Brightness not found in testdimmer %s', ac.name)
        cl.getValue(function (context, value) {
          assert.strict.equal(value, 0)
        })

        cl.emit('get', function (context, result) {
          assert.strict.equal(result, 0, 'get logic result should be 0')
        })
      })
      done()
    })

    it('set test dimmer via HK to  50%', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testdimmer %s', ac.name)
        let cb = s.getCharacteristic(Characteristic.Brightness)
        assert.ok(cb, 'Characteristic.Brightness not found in testdimmer %s', ac.name)
        // Set Delay to 0 sec for use with tests
        ac.appliance.delayOnSet = 0
        cb.emit('set', 50, function () {
          let res = platform.homebridge.getCCUDummyValue(ac.appliance.address + '.LEVEL')
          assert.strict.equal(res, 0.5, 'Brightness of ' + ac.appliance.address + '.LEVEL' + ' should be 0.5 is ', res)
        })
      })
      done()
    })
  })
})
