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
  let datapath = path.join(__dirname, 'data', 'data_test_switch.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {
    ccu_ip: '127.0.0.1',
    subsection: 'HomeKit',
    testdata: data
  }
  var platform = new homebridgeMock.PlatformType(log, config)

  before(function () {
    log.debug('Init Platform with Switch')
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

  describe('Homebridge Platform Switch Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 2)
      done()
    })

    it('test switch on', function (done) {
      // send BidCos-RF.ABC1234560:1.STATE a on Message
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', true])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'STATE', true])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testswitch %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 1)
        })
      })
      done()
    })

    it('test switch off', function (done) {
      // Switch Off
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', false])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'STATE', false])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testswitch %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0)
        })
      })
      done()
    })

    it('set switch to on via HK', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        let co = s.getCharacteristic(Characteristic.On)
        assert.ok(co, 'Characteristic.On not found in testswitch %s', ac.name)
        // Set Delay to 0 sec for use with tests
        ac.delayOnSet = 0
        co.emit('set', false, function () {
          let res = platform.homebridge.values[ac.adress + '.STATE']
          assert.strict.equal(res, false)
        })
      })
      done()
    })

    it('test switch on and check HK Value', function (done) {
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        s.delayOnSet = 0
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testswitch %s', ac.name)
        // Switch
        cc.emit('set', 1, function () {
          let res = platform.homebridge.values[ac.adress + '.STATE']
          assert.strict.equal(res, true)
          cc.emit('get', function (context, result) {
            assert.strict.equal(result, true)
          })
        })
      })
      done()
    })

    it('test switch on via HK off via xmlrpc', function (done) {
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        s.delayOnSet = 0
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testswitch %s', ac.name)
        // Switch
        cc.emit('set', 1, function () {
          let res = platform.homebridge.values[ac.adress + '.STATE']
          assert.strict.equal(res, true)
          cc.emit('get', function (context, result) {
            assert.strict.equal(result, true)
            // get address from my device
            let adr = ac.adress.split('.')[1]
            // set this to false
            platform.xmlrpc.event(['BidCos-RF', adr, 'STATE', false])
            cc.emit('get', function (context, result) {
              assert.strict.equal(result, false)
            })
          })
        })
      })
      done()
    })

    it('test different switch states in one device', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', false])
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'STATE', true])
      let ac1 = that.accessories[0]
      let s1 = ac1.get_Service(Service.Lightbulb)
      assert.ok(s1, 'Service.Lightbulb not found in testswitch %s', ac1.name)
      let cc1 = s1.getCharacteristic(Characteristic.On)
      assert.ok(cc1, 'Characteristic.On not found in testswitch %s', ac1.name)
      cc1.emit('get', function (context, result1) {
        assert.strict.equal(result1, false)
      })

      let ac2 = that.accessories[1]
      let s2 = ac2.get_Service(Service.Lightbulb)
      assert.ok(s2, 'Service.Lightbulb not found in testswitch %s', ac2.name)
      let cc2 = s2.getCharacteristic(Characteristic.On)
      assert.ok(cc2, 'Characteristic.On not found in testswitch %s', ac2.name)
      cc2.emit('get', function (context, result2) {
        assert.strict.equal(result2, true)
      })

      done()
    })
  })
})
