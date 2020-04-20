'use strict'

const assert = require('assert')
const log = require('./logger')._system
const path = require('path')
const fs = require('fs')
var EveHomeKitTypes = require('../../ChannelServices/EveHomeKitTypes.js')
let eve

const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  let datapath = path.join(__dirname, 'data', 'data_test_HM-ES-TX-WM.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {
    ccu_ip: '127.0.0.1',
    subsection: 'HomeKit',
    testdata: data
  }
  var platform = new homebridgeMock.PlatformType(log, config)
  eve = new EveHomeKitTypes(platform)

  before(function () {
    log.debug('Init Platform with Energy Counter')
    platform.accessories(function (acc) {
      that.accessories = acc
      log.debug('ServiceClass %s', acc[0].serviceClassName)
    })
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.shutdown()
    })
  })

  describe('Homebridge Platform HM-ES-TX-WM Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('test set power to 230 w and consumption to 42.42kwh', function (done) {
      platform.xmlrpc.event(['BidCos-RF', 'ADR1234567890:1', 'POWER', 230])
      platform.xmlrpc.event(['BidCos-RF', 'ADR1234567890:1', 'ENERGY_COUNTER', 42420])

      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(eve.Service.PowerMeterService)
        assert.ok(s, 'Service.PowerMeterService not found in Energy Counter %s', ac.name)
        let cp = s.getCharacteristic(eve.Characteristic.ElectricPower)
        assert.ok(cp, 'Characteristic.ElectricPower not found in Energy Counter %s', ac.name)
        cp.getValue(function (context, value) {
          assert.strict.equal(value, 230, 'Power is ' + value + ' not 230')
        })

        let ce = s.getCharacteristic(eve.Characteristic.TotalConsumption)
        assert.ok(ce, 'Characteristic.TotalConsumption not found in Energy Counter %s', ac.name)
        ce.getValue(function (context, value) {
          // haz to be devided by 1000 -> wh vs kwh
          assert.strict.equal(value, '42.42')
        })
      })
      done()
    })
  })
})
