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
  let datapath = path.join(__dirname, 'data', 'data_test_HMIP-PS.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data}
  var platform = new homebridgeMock.PlatformType(log, config)

  before(function () {
    log.debug('Init Platform with Switch')
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

  describe('Homebridge Platform Switch IP Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.equal(that.accessories.length, 1)
      done()
    })

    it('test ip switch on', function (done) {
      // send HmIP-RF.ADR1234567890:3.STATE a on Message
      platform.xmlrpc.event(['HmIP-RF.', 'ADR1234567890:3', 'STATE', true])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testswitch %s', ac.name)
        cc.getValue(function (context, value) {
          assert.equal(value, true)
        })
      })
      done()
    })

    it('test ip switch off', function (done) {
      // Switch Off
      platform.xmlrpc.event(['HmIP-RF.', 'ADR1234567890:3', 'STATE', false])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Lightbulb)
        assert.ok(s, 'Service.Lightbulb not found in testswitch %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.On)
        assert.ok(cc, 'Characteristic.On not found in testswitch %s', ac.name)
        cc.getValue(function (context, value) {
          assert.equal(value, false)
        })
      })
      done()
    })

    it('set ip switch to on via HK', function (done) {
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
          assert.equal(res, 0)
        })
      })
      done()
    })
  })
})
