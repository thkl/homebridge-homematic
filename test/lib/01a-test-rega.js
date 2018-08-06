'use strict'

const assert = require('assert')
const log = require('./logger')._system
const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  describe('Homebridge Platform', function () {
    it('registerPlatform is called with name', function () {
      assert.equal(homebridgeMock.pluginName, 'homebridge-homematic')
    })

    it('registerPlatform is called with config name', function () {
      assert.equal(homebridgeMock.configName, 'HomeMatic')
    })

    it('Platform is here', function () {
      assert.ok(homebridgeMock.PlatformType, 'Platform not defined')
    })
  })

  describe('Homebridge Platform Functionality', function () {
    describe('Homebridge Platform', function () {
      it('send datapoint via rega', function (done) {
        // load some devices
        var platform = new homebridgeMock.PlatformType(log, {ccu_ip: '127.0.0.1', subsection: 'HomeKit'})
        platform.setValue_rega('BidCos-RF', 'ABCD12345:1', 'STATE', true)
        platform.getValue_rega('BidCos-RF', 'ABCD12345:1', 'STATE', function (value) {
          assert.equal(value, true)
        })
        done()
      })

      it('send datapoint via rega check rpc', function (done) {
        // load some devices
        var platform = new homebridgeMock.PlatformType(log, {ccu_ip: '127.0.0.1', subsection: 'HomeKit'})
        platform.setValue_rega('BidCos-RF', 'ABCD12345:1', 'STATE', true)
        platform.getValue('BidCos-RF', 'ABCD12345:1', 'STATE', function (value) {
          assert.equal(value, true)
        })
        done()
      })
    })
  })
})
