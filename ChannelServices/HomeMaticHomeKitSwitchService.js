'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitSwitchService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    this.ignoreWorking = true
    this.usecache = false
    // disable multi channel mode so HomeMaticRPC will not check device address on events
    this.isMultiChannel = false
    this.delayOnSet = 1000

    if (this.special === 'PROGRAM') {
      this.log.debug('[Switch Service] Creating Program Service')
      this.createProgrammService(Service, Characteristic)
    } else

    if (this.special === 'OUTLET') {
      this.createOutletService(Service, Characteristic)
      this.addCoreSwitchFunctions(Service, Characteristic)
      this.registerEvents()
    } else {
      this.createLightBulbService(Service, Characteristic)
      this.addCoreSwitchFunctions(Service, Characteristic)
      this.registerEvents()
    }
  }

  registerEvents () {
    let self = this
    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('STATE'), self, function (newValue) {
      let hmState = this.isTrue(newValue) ? 1 : 0
      self.log.debug('[Switch Service] Event result %s hm %s', newValue, hmState)

      if (self.c_isOn !== undefined) {
        self.c_isOn.updateValue(hmState, null)
      }

      if (self.c_isInUse !== undefined) {
        self.c_isInUse.updateValue(hmState, null)
      }
    })
  }

  createProgrammService (Service, Characteristic) {
    let self = this
    this.service_item = this.getService(Service.Outlet)
    this.programm = this.service_item.getCharacteristic(Characteristic.OutletInUse)
      .on('get', function (callback) {
        if (callback) callback(null, 1)
      })

    this.c_isOn = this.service_item.getCharacteristic(Characteristic.On)
      .on('get', function (callback) {
        if (callback) callback(null, 0)
      })

      .on('set', function (value, callback) {
        if ((value === 1) || (value === true)) {
          self.log.debug('[Switch Service] Launch Program ' + self.address)
          self.command('sendregacommand', '', 'var x=dom.GetObject("' + self.address + '");if (x) {x.ProgramExecute();}', function () { })

          setTimeout(function () {
            self.c_isOn.setValue(0, null)
          }, self.delayOnSet)
        }
        let result = 0
        callback(result)
      })
  }

  addCoreSwitchFunctions (Service, Characteristic) {
    let self = this
    this.c_isOn = this.service_item.getCharacteristic(Characteristic.On)

      .on('get', function (callback) {
        self.log.debug('[Switch Service] get Characteristic.On')
        self.query('STATE', function (value) {
          let hkState = ((value === '1') || (value === true) || (value === 'true') || (value === 1))
          self.log.debug('[Switch Service] (%s) Switch Get CCU is %s will return %s', self.address, value, hkState)
          if (callback) callback(null, hkState)
        })
      })

      .on('set', function (value, callback) {
        self.log.debug('[Switch Service] set Characteristic.On to %s', value)
        if (self.readOnly === false) {
          var onTime = self.getCache('ON_TIME')
          if ((onTime !== undefined) && (onTime > 0) && (value === 1)) {
            self.command('set', 'ON_TIME', onTime)
          }
          if ((value === 0) || (value === false)) {
            self.log.debug('[Switch Service] set off')
            self.delayed('set', 'STATE', false)
          } else {
            self.log.debug('[Switch Service] set on')
            self.delayed('set', 'STATE', true)
          }
        } else {
          self.log.debug('[Switch Service] ignore Device is readonly')
        }

        callback()
      })

    var onTimeProperties = {
      format: Characteristic.Formats.FLOAT,
      unit: Characteristic.Units.SECONDS,
      minValue: 0,
      maxValue: 3600.0, // normally defined as 85825945.6 but self`s in Hesperus inconvenient and unusable
      minStep: 1,
      perms: [Characteristic.Perms.WRITE]
    }

    this.onTime = new Characteristic('OnTime', 'CEA288AC-EAC5-447A-A2DD-D684E4517440', onTimeProperties)
      .on('set', function (value, callback) {
        self.setCache('ON_TIME', value)
        callback()
      })

    this.onTime.eventEnabled = true
    this.getCharacteristic(this.service_item, this.onTime)
    this.c_isOn.eventEnabled = true
  }

  createLightBulbService (Service, Characteristic) {
    this.log.debug('[Switch Service] createLightBulbService')
    this.service_item = this.getService(Service.Lightbulb)
  }

  createOutletService (Service, Characteristic) {
    this.service_item = this.getService(Service.Outlet)
    this.outletinuse = this.service_item.getCharacteristic(Characteristic.OutletInUse)
      .on('get', function (callback) {
        if (callback) callback(null, 1)
      })
  }

  shutdown () {
    this.log.debug('[SWITCH] shutdown')
    super.shutdown()
  }
}

module.exports = HomeMaticHomeKitSwitchService
