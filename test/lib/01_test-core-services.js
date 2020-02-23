'use strict'

const assert = require('assert')
const log = require('./logger')._system
const path = require('path')
const fs = require('fs')

const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  let that = this

  after(function () {
  })

  describe('Homebridge Platform', function () {
    it('registerPlatform is called with name', function () {
      assert.strict.equal(homebridgeMock.pluginName, 'homebridge-homematic')
    })

    it('registerPlatform is called with config name', function () {
      assert.strict.equal(homebridgeMock.configName, 'HomeMatic')
    })

    it('Platform is here', function () {
      assert.ok(homebridgeMock.PlatformType, 'Platform not defined')
    })
  })

  describe('Homebridge Platform Functionality', function () {
    describe('Homebridge Platform', function () {
      it('creates 5 accessories', function (done) {
        // load some devices
        let datapath = path.join(__dirname, 'data', 'data_test_common.json')
        let data = fs.readFileSync(datapath).toString()
        var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
        var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)
        platform.homebridge.fireHomeBridgeEvent('didFinishLaunching')

        platform.homebridge.accessories(function (acc) {
          assert.ok(acc, 'Did not find any accessories!' + acc)
          assert.strict.equal(acc.length, 5)
          // shutdown devices to kill all timers and so
          acc.map(ac => {
            ac.appliance.shutdown()
          })
        })
        done()
      })
    })
  })
})
