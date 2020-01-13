'use strict'

const assert = require('assert')
const log = require('./logger')._system
const Characteristic = require('./characteristic-mock').Characteristic
const Service = require('./service-mock').Service

const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  let data = '{"devices":[]}'
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config)
  platform.programs = ['TestProgram']
  platform.iosworkaround = true

  before(function () {
    log.debug('Init Platform with Switch (Sprinkler mode)')
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

  describe('Homebridge Platform Switch(Program mode) Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      // Check the correct type for AC1
      let ac = that.accessories[0]
      let s = ac.get_Service(Service.Outlet)
      assert.ok(s, '%s is not Service.Outlet !', ac.name)
      done()
    })

    it('test switch launch', function (done) {
      let ac = that.accessories[0]
      let s = ac.get_Service(Service.Outlet)
      assert.ok(s, 'Service.Outlet not found in program %s', ac.name)
      let ca = s.getCharacteristic(Characteristic.On)
      assert.ok(ca, 'Characteristic.On not found in program %s', ac.name)
      ac.delayOnSet = 0
      ca.emit('set', 1, function () {
        assert.strict.equal(platform.homebridge.values['lastScript'], 'var x=dom.GetObject("TestProgram");if (x) {x.ProgramExecute();}', 'Script was not sent')
      })
      ac.delayOnSet = 0
      // Check reset of switch
      ca.getValue(function (context, value) {
        assert.strict.equal(value, false)
      })
      done()
    })

    it('test switch was resetet', function (done) {
      let ac = that.accessories[0]
      let s = ac.get_Service(Service.Outlet)
      assert.ok(s, 'Service.Outlet not found in program %s', ac.name)
      let ca = s.getCharacteristic(Characteristic.On)
      assert.ok(ca, 'Characteristic.On not found in program %s', ac.name)
      // Check reset of switch
      ca.getValue(function (context, value) {
        if (value === 0) { value = false }
        assert.strict.equal(value, false)
      })
      done()
    })
  })
})
