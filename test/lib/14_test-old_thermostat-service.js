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
  let datapath = path.join(__dirname, 'data', 'data_test_old_thermostat.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config)

  before(function () {
    log.debug('Init Platform with Leagacy Wall Thermostat')
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

  describe('Homebridge Platform Leagacy Wall Thermostat Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    let testDegrees = [10, 0, -10, 20.5]
    let max = 70
    let min = 20

    testDegrees.map(testdegree => {
      let hum = Math.random() < 0.5 ? ((1 - Math.random()) * (max - min) + min) : (Math.random() * (max - min) + min)
      it('test set temperature to ' + testdegree + ' degrees humidity to ' + hum, function (done) {
        platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'TEMPERATURE', testdegree])
        platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'HUMIDITY', hum])
        // check
        that.accessories.map(ac => {
          let s = ac.get_Service(Service.Thermostat)
          assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)
          let cc = s.getCharacteristic(Characteristic.CurrentTemperature)
          assert.ok(cc, 'Characteristic.CurrentTemperature not found in Thermostat %s', ac.name)
          cc.getValue(function (context, value) {
            assert.strict.equal(value, testdegree, 'Temperature is ' + value + ' not ' + testdegree)
          })
          // Only check Humidity if there is a sensor
          if (ac.currentHumidityCharacteristic !== undefined) {
            let ch = s.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            assert.ok(ch, 'Characteristic.CurrentRelativeHumidity not found in Thermometer %s', ac.name)
            ch.getValue(function (context, value) {
              assert.strict.equal(value, hum, 'Humidity is ' + value + ' not ' + hum)
            })
          }
        })
        done()
      })
    })

    // Test SetPoints
    it('test read target temperature set to 20', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'SETPOINT', 20])
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Thermostat)
        assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)

        let cc = s.getCharacteristic(Characteristic.TargetTemperature)
        assert.ok(cc, 'Characteristic.TargetTemperature not found in Thermostat %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 20, 'target temperature did not match 20 degrees')
        })
      })
      done()
    })

    it('test set target temperature to 17 via SETPOINT', function (done) {
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.Thermostat)
        // Set Delay to 0 sec for use with tests
        ac.delayOnSet = 0
        // We have to set ControlMode to 1 ... so the target Datapoint is SET_TEMPERATURE
        assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.TargetTemperature)
        assert.ok(cc, 'Characteristic.TargetTemperature not found in Thermostat %s', ac.name)
        cc.emit('set', 17, function () {
          let dp = ac.deviceAdress + ':2.SETPOINT'
          let res = platform.homebridge.values[dp]
          assert.strict.equal(res, 17, 'SETPOINT shoud be at 17 degrees  is ' + res)
        })
      })
      done()
    })
  })
})
