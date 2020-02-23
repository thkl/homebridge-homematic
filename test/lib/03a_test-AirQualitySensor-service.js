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
  let datapath = path.join(__dirname, 'data', 'data_test_airqualitysensor.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {
    ccu_ip: '127.0.0.1',
    subsection: 'HomeKit',
    testdata: data
  }

  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)

  before(function () {
    platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.STATE', 2)
    log.debug('Init Platform with CO2 Sensor HM-CC-SCD')
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

  describe('Homebridge Platform HM-CC-SCD Service Test', function () {
    this.timeout(1000)

    it('check accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('test initial values sensor must be Characteristic.CO2_LEVELS_ABNORMAL', function (done) {
      let ac = that.accessories[0]
      let s = ac.getService(Service.CarbonDioxideSensor)
      assert.ok(s, 'Service.CarbonDioxideSensor not found in %s', ac.name)
      let cc = s.getCharacteristic(Characteristic.CarbonDioxideDetected)
      assert.ok(cc, 'Characteristic.CarbonDioxideDetected not found in %s', ac.name)
      cc.getValue(function (context, value) {
        assert.strict.equal(value, 1, 'CarbonDioxideDetected must be 1 is ' + value)
      })
      // Reset Value
      platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.STATE', 0)
      done()
    })

    it('test c02 level ok ', function (done) {
      // send BidCos-RF.ABC1234560:1.STATE a on Message
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.CarbonDioxideSensor)
        assert.ok(s, 'Service.CarbonDioxideSensor not found in  %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CarbonDioxideDetected)
        assert.ok(cc, 'Characteristic.CarbonDioxideDetected not found in %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'No CO2 should be detected (0) is ' + value)
        })
        done()
      })
    })

    it('test c02 level mid', function (done) {
      // Switch Off
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.CarbonDioxideSensor)
        assert.ok(s, 'Service.CarbonDioxideSensor not found in %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CarbonDioxideDetected)
        assert.ok(cc, 'Characteristic.CarbonDioxideDetected not found in %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0, 'No CO2 should be detected (0) is ' + value)
        })
      })
      done()
    })

    it('test c02 level mid', function (done) {
      // Switch Off
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'STATE', 2])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.CarbonDioxideSensor)
        assert.ok(s, 'Service.CarbonDioxideSensor not found in %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CarbonDioxideDetected)
        assert.ok(cc, 'Characteristic.CarbonDioxideDetected not found in %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 1, 'CO2 Sensor should be 1 is ' + value)
        })
      })
      done()
    })
  })
})
