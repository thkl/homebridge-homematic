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
  let datapath = path.join(__dirname, 'data', 'data_test_rhs.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {
    ccu_ip: '127.0.0.1',
    subsection: 'HomeKit',
    testdata: data,
    services: [{
      type: 'ABC1234560:1',
      service: 'HomeMaticHomeKitRotaryHandleService',
      options: { 'hk_type': 'WINDOW' }
    }]
  }

  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)

  before(function () {
    log.debug('Init Platform with Switch')
    platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.STATE', 1)
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

  describe('Homebridge Platform RHS (as Window) Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('test initial values rhs must be open', function (done) {
      let ac = that.accessories[0]
      let s = ac.getService(Service.Window)
      assert.ok(s, 'Service.Window not found in rhs ' + ac.name)
      let cc = s.getCharacteristic(Characteristic.CurrentPosition)
      assert.ok(cc, 'Characteristic.CurrentPosition not found in rhs %s', ac.name)
      cc.getValue(function (context, value) {
        assert.strict.equal(value, 50, 'get logic result should be 50%')
      })
      cc.emit('get', function (context, result) {
        assert.strict.equal(result, 50, 'get logic result should be 50%')
      })

      // Reset Value
      platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.STATE', 0)
      done()
    })

    it('test RHS close', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.Window)
        assert.ok(s, 'Service.ContactSensor not found in rhs %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(cc, 'Characteristic.CurrentPosition not found in rhs %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'Send 0 CurrentPosition should be 0')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 0, 'get logic result should be 0')
        })
        let ct = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ct, 'Characteristic.TargetPosition not found in rhs %s', ac.name)
        ct.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'Send 1 TargetPosition should be 0')
        })
        ct.emit('get', function (context, result) {
          assert.strict.equal(result, 0, 'get logic result should be 0')
        })
      })
      done()
    })

    it('test rhs open flip mode', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.Window)
        assert.ok(s, 'Service.ContactSensor not found in rhs %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(cc, 'Characteristic.CurrentPosition not found in rhs %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 50, 'Send 1 CurrentPosition should be 50')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 50, 'get logic result should be 50')
        })
        let ct = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ct, 'Characteristic.TargetPosition not found in rhs %s', ac.name)
        ct.getValue(function (context, value) {
          assert.strict.equal(value, 50, 'Send 1 TargetPosition  should be 50')
        })
        ct.emit('get', function (context, result) {
          assert.strict.equal(result, 50, 'get logic result should be 50')
        })
      })
      done()
    })

    it('test rhs open full', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', 2])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.Window)
        assert.ok(s, 'Service.ContactSensor not found in rhs %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CurrentPosition)
        assert.ok(cc, 'Characteristic.CurrentPosition not found in rhs %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 100, 'Send 2 CurrentPosition should be 100')
        })
        cc.emit('get', function (context, result) {
          assert.strict.equal(result, 100, 'get logic result should be 100')
        })
        let ct = s.getCharacteristic(Characteristic.TargetPosition)
        assert.ok(ct, 'Characteristic.TargetPosition not found in rhs %s', ac.name)
        ct.getValue(function (context, value) {
          assert.strict.equal(value, 100, 'Send 2 TargetPosition should be 100')
        })
        ct.emit('get', function (context, result) {
          assert.strict.equal(result, 100, 'get logic result should be 100')
        })
      })
      done()
    })
  })
})
