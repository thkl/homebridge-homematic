'use strict'

const assert = require('assert')
const log = require('./logger')._system
const path = require('path')
const fs = require('fs')

const homebridgeMock = require('./homebridge-mock')()
var EveHomeKitTypes = require('../../ChannelServices/EveHomeKitTypes.js')
let eve

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  let datapath = path.join(__dirname, 'data', 'data_test_HMIP-PSM.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data}
  var platform = new homebridgeMock.PlatformType(log, config)
  eve = new EveHomeKitTypes(platform)

  before(function () {
    log.debug('Init Platform with Energy Counter')
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

  describe('Homebridge Platform Energy Counter Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.equal(that.accessories.length, 1)
      done()
    })

    it('test set voltage to 230 v, current to 500 mA, power to 230 w', function (done) {
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:6', 'VOLTAGE', 230])
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:6', 'CURRENT', 500])
      platform.xmlrpc.event(['HmIP-RF', 'ADR1234567890:6', 'POWER', 230])

      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(eve.Service.PowerMeterService)
        assert.ok(s, 'Service.PowerMeterService not found in Energy Counter %s', ac.name)
        let cp = s.getCharacteristic(eve.Characteristic.ElectricPower)
        assert.ok(cp, 'Characteristic.ElectricPower not found in Energy Counter %s', ac.name)
        cp.getValue(function (context, value) {
          assert.equal(value, 230, 'Power is ' + value + ' not 230')
        })

        let cc = s.getCharacteristic(eve.Characteristic.ElectricCurrent)
        assert.ok(cc, 'Characteristic.ElectricCurrent not found in Energy Counter %s', ac.name)
        cc.getValue(function (context, value) {
          // Note there is a internal recalculation to amepere ccu sends milliamps
          assert.equal(value, 0.5, 'Current is ' + value + ' not 0.5A')
        })

        let cv = s.getCharacteristic(eve.Characteristic.Voltage)
        assert.ok(cv, 'Characteristic.Voltage not found in Energy Counter %s', ac.name)
        cv.getValue(function (context, value) {
          assert.equal(value, 230, 'Voltage is ' + value + ' not 230')
        })
      })
      done()
    })
  })
})
