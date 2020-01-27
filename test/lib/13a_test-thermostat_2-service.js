'use strict'

const assert = require('assert')
const log = require('./logger')._system
const path = require('path')
const fs = require('fs')
const Characteristic = require('./characteristic-mock').Characteristic
const Service = require('./service-mock').Service

const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function() {
    let datapath = path.join(__dirname, 'data', 'data_test_wall_thermostat.json')
    let data = fs.readFileSync(datapath).toString()
    let that = this
    var config = {
        ccu_ip: '127.0.0.1',
        subsection: 'HomeKit',
        testdata: data
    }
    var platform = new homebridgeMock.PlatformType(log, config)

    before(function() {
        log.debug('Init Platform with Wall Thermostat')
        platform.accessories(function(acc) {
            that.accessories = acc
        })
    })

    after(function() {
        log.debug('Shutdown Platform')
        that.accessories.map(ac => {
            ac.shutdown()
        })
    })

    describe('Homebridge Platform Wall Thermostat Service Test', function() {
        it('test accessory build', function(done) {
            assert.ok(that.accessories, 'Did not find any accessories!')
            assert.strict.equal(that.accessories.length, 1)
            done()
        })

        let testDegrees = [10, 0, -10, 20.5]
        let max = 70
        let min = 20

        testDegrees.map(testdegree => {
            let hum = Math.random() < 0.5 ? ((1 - Math.random()) * (max - min) + min) : (Math.random() * (max - min) + min)
            it('test set temperature to ' + testdegree + ' degrees humidity to ' + hum, function(done) {
                platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'ACTUAL_TEMPERATURE', testdegree])
                platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'ACTUAL_HUMIDITY', hum])
                    // check
                that.accessories.map(ac => {
                    let s = ac.get_Service(Service.Thermostat)
                    assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)
                    let cc = s.getCharacteristic(Characteristic.CurrentTemperature)
                    assert.ok(cc, 'Characteristic.CurrentTemperature not found in Thermostat %s', ac.name)
                    cc.getValue(function(context, value) {
                            assert.strict.equal(value, testdegree)
                        })
                        // Only check Humidity if there is a sensor
                    if (ac.currentHumidityCharacteristic !== undefined) {
                        let ch = s.getCharacteristic(Characteristic.CurrentRelativeHumidity)
                        assert.ok(ch, 'Characteristic.CurrentRelativeHumidity not found in Thermometer %s', ac.name)
                        ch.getValue(function(context, value) {
                            assert.strict.equal(value, hum)
                        })
                    }
                })
                done()
            })
        })

        // Test SetPoints
        it('test read target temperature set to 20', function(done) {
            platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:2', 'SET_TEMPERATURE', 20])
            that.accessories.map(ac => {
                let s = ac.get_Service(Service.Thermostat)
                assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)

                let cc = s.getCharacteristic(Characteristic.TargetTemperature)
                assert.ok(cc, 'Characteristic.TargetTemperature not found in Thermostat %s', ac.name)
                cc.getValue(function(context, value) {
                    assert.strict.equal(value, 20, 'target temperature did not match 20 degrees')
                })
            })
            done()
        })

        it('test set target temperature to 17 via SET_TEMPERATURE', function(done) {
            that.accessories.map(ac => {
                let s = ac.get_Service(Service.Thermostat)
                    // Set Delay to 0 sec for use with tests
                ac.delayOnSet = 0
                    // We have to set ControlMode to 1 ... so the target Datapoint is SET_TEMPERATURE
                ac.setCache('CONTROL_MODE', 1)
                assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)
                let cc = s.getCharacteristic(Characteristic.TargetTemperature)
                assert.ok(cc, 'Characteristic.TargetTemperature not found in Thermostat %s', ac.name)
                cc.emit('set', 17, function() {
                    let dp = ac.adress + '.SET_TEMPERATURE'
                    let res = platform.homebridge.values[dp]
                    assert.strict.equal(res, 17, 'SET_TEMPERATURE shoud be at 17 degrees  is ' + res)
                })
            })
            done()
        })

        it('test set target temperature to 17 via MANU_MODE', function(done) {
            that.accessories.map(ac => {
                let s = ac.get_Service(Service.Thermostat)
                    // Set Delay to 0 sec for use with tests
                ac.delayOnSet = 0
                    // We have to set ControlMode to 0 ... so the target Datapoint is MANU_MODE
                ac.setCache('CONTROL_MODE', 0)
                assert.ok(s, 'Service.TemperatureSensor not found in Thermostat %s', ac.name)
                let cc = s.getCharacteristic(Characteristic.TargetTemperature)
                assert.ok(cc, 'Characteristic.TargetTemperature not found in Thermostat %s', ac.name)
                cc.emit('set', 17, function() {
                    let dp = ac.adress + '.MANU_MODE'
                    let res = platform.homebridge.values[dp]
                    assert.strict.equal(res, 17, 'MANU_MODE shoud be at 17 degrees  is ' + res)
                })
            })
            done()
        })
    })
})