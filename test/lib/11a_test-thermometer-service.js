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
  let datapath = path.join(__dirname, 'data', 'data_test_thermoweather.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)

  before(function () {
    log.debug('Init Platform with Thermometer')
    platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.TEMPERATURE', 21.5)
    platform.homebridge.setCCUDummyValue('BidCos-RF.ABC1234560:1.HUMIDITY', 57)
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

  describe('Homebridge Platform Thermometer Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('test initial values', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.TemperatureSensor)
        assert.ok(s, 'Service.TemperatureSensor not found in Thermometer %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CurrentTemperature)
        assert.ok(cc, 'Characteristic.CurrentTemperature not found in Thermometer %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 21.5)
        })

        let sh = ac.getService(Service.HumiditySensor)
        assert.ok(sh, 'Service.HumiditySensor not found in Thermometer %s', ac.name)
        let ch = sh.getCharacteristic(Characteristic.CurrentRelativeHumidity)
        assert.ok(ch, 'Characteristic.CurrentRelativeHumidity not found in Thermometer %s', ac.name)
        ch.getValue(function (context, value) {
          assert.strict.equal(value, 57)
        })
      })
      done()
    })

    let testDegrees = [10, 0, -10, 20.5, 7, 3, 12, 17, 37]
    let max = 70
    let min = 20

    testDegrees.map(testdegree => {
      it('test ' + testdegree + ' degrees', function (done) {
        let hum = Math.random() < 0.5 ? ((1 - Math.random()) * (max - min) + min) : (Math.random() * (max - min) + min)
        platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'TEMPERATURE', testdegree])
        platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'HUMIDITY', hum])
        // check
        that.accessories.map(ac => {
          let s = ac.getService(Service.TemperatureSensor)
          assert.ok(s, 'Service.TemperatureSensor not found in Thermometer %s', ac.name)
          let cc = s.getCharacteristic(Characteristic.CurrentTemperature)
          assert.ok(cc, 'Characteristic.CurrentTemperature not found in Thermometer %s', ac.name)
          cc.getValue(function (context, value) {
            assert.strict.equal(value, testdegree)
          })

          let sh = ac.getService(Service.HumiditySensor)
          assert.ok(sh, 'Service.HumiditySensor not found in Thermometer %s', ac.name)
          let ch = sh.getCharacteristic(Characteristic.CurrentRelativeHumidity)
          assert.ok(ch, 'Characteristic.CurrentRelativeHumidity not found in Thermometer %s', ac.name)
          ch.getValue(function (context, value) {
            assert.strict.equal(value, hum)
          })
        })
        done()
      })
    })
  })
})
