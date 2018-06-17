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
  let datapath = path.join(__dirname, 'data', 'data_test_thermometer.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data}
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

  describe('Homebridge Platform Thermometer Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.equal(that.accessories.length, 1)
      done()
    })

    let testDegrees = [10, 0, -10, 20.5]
    testDegrees.map(testdegree => {
      it('test ' + testdegree + ' degrees on', function (done) {
        platform.xmlrpc.event(['BidCos-RF', 'ABC1234560:1', 'TEMPERATURE', testdegree])
        // check
        that.accessories.map(ac => {
          let s = ac.get_Service(Service.TemperatureSensor)
          assert.ok(s, 'Service.TemperatureSensor not found in Thermometer %s', ac.name)
          let cc = s.getCharacteristic(Characteristic.CurrentTemperature)
          assert.ok(cc, 'Characteristic.CurrentTemperature not found in Thermometer %s', ac.name)
          cc.getValue(function (context, value) {
            assert.equal(value, testdegree)
          })
        })
        done()
      })
    })
  })
})
