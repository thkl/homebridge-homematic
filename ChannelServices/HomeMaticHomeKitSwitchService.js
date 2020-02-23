'use strict'

const path = require('path')
const fs = require('fs')
const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitSwitchService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    let self = this
    this.ignoreWorking = true
    this.usecache = false
    // disable multi channel mode so HomeMaticRPC will not check device address on events
    this.isMultiChannel = false
    this.delayOnSet = 1000

    if (this.special === 'PROGRAM') {
      this.log.debug('[Switch Service] Creating Program Service')
      this.createProgrammService(Service, Characteristic)
    } else

    if (this.special === 'VALVE') {
      let strPath = path.join(this.platform.localPath, this.address) + '.json'
      if (fs.existsSync(strPath)) {
        let data = fs.readFileSync(strPath).toString()
        if (data !== undefined) {
          try {
            var jData = JSON.parse(data)
            this.setDuration = jData['duration']
          } catch (e) {
            this.setDuration = 0
          }
        } else {
          this.setDuration = 0
        }
      }
      self.remainTime = 0
      this.createValveService(Service, Characteristic)
      this.registerEvents()
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
      if (hmState === 0) {
        self.remainTime = 0
        if (self.c_timeRemain !== undefined) {
          self.c_timeRemain.updateValue(self.remainTime, null)
        }
      }

      if (self.c_isActive !== undefined) {
        self.c_isActive.updateValue(hmState, null)
      }

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

  createValveService (Service, Characteristic) {
    let self = this
    this.service_item = this.getService(Service.Valve)
    this.remainTime = -99

    this.configured = this.service_item.getCharacteristic(Characteristic.IsConfigured)
      .on('get', function (callback) {
        callback(null, Characteristic.IsConfigured.CONFIGURED)
      })

    this.configured.updateValue(Characteristic.IsConfigured.CONFIGURED, null)

    // Load ValveType from parameters #268
    // Characteristic.ValveType.GENERIC_VALVE = 0;
    // Characteristic.ValveType.IRRIGATION = 1;
    // Characteristic.ValveType.SHOWER_HEAD = 2;
    // Characteristic.ValveType.WATER_FAUCET = 3;
    let types = this.getClazzConfigValue('types', undefined)
    this.log.debug(types)
    var vtype = Characteristic.ValveType.IRRIGATION
    if (types !== undefined) {
      if (types[this.address] !== undefined) {
        vtype = types[this.address]
      }
      if (vtype > 3) {
        vtype = 0
      }
    }

    this.valveType = this.service_item.getCharacteristic(Characteristic.ValveType)
      .on('get', function (callback) {
        callback(null, vtype)
      })

    this.valveType.updateValue(vtype, null)

    this.setDurationCharacteristic = this.service_item.getCharacteristic(Characteristic.SetDuration)
      .on('get', function (callback) {
        self.log.debug('[Switch Service] get Characteristic.SetDuration')
        callback(null, self.setDuration)
      })

      .on('set', function (value, callback) {
        self.setDuration = value
        self.log.debug('[Switch Service] set Characteristic.SetDuration %s', value)

        let strPath = path.join(self.platform.localPath, self.address) + '.json'
        fs.writeFileSync(strPath, JSON.stringify({
          duration: self.setDuration
        }))

        callback()
      })

    this.c_isActive = this.service_item.getCharacteristic(Characteristic.Active)
      .on('get', function (callback) {
        self.log.debug('get Active')
        self.query('STATE', function (value) {
          let hmState = self.isTrue(value) ? 1 : 0
          if (callback) callback(null, hmState)
        })
      })

      .on('set', function (value, callback) {
        if (value === 0) {
          self.command('setrega', 'STATE', 0)
          self.remainTime = 0
          clearTimeout(self.valveTimer)
          callback()
        } else {
          self.remainTime = (self.setDuration) ? self.setDuration : 0
          self.isInUse = 1
          if (self.remainTime > 0) {
            self.command('setrega', 'ON_TIME', self.remainTime, function () {
              self.command('setrega', 'STATE', 1)
              self.updateValveTimer()
              callback()
            })
          } else {
            self.command('setrega', 'STATE', 1)
            callback()
          }
        }
      })

    this.c_isActive.updateValue(Characteristic.Active.ACTIVE, null)

    this.c_isInUse = this.service_item.getCharacteristic(Characteristic.InUse)
      .on('get', function (callback) {
        self.log.debug('get Active')
        self.query('STATE', function (value) {
          let hmState = self.isTrue(value) ? 1 : 0
          if (callback) callback(null, hmState)
        })
      })

      .on('set', function (value, callback) {
        self.isInUse = value
        callback()
      })

    this.c_timeRemain = this.service_item.getCharacteristic(Characteristic.RemainingDuration)
      .on('get', function (callback) {
        callback(null, self.remainTime)
      })
  }

  updateValveTimer () {
    let self = this
    if (this.remainTime === 0) {
      return
    }

    this.remainTime = this.remainTime - 1
    // SET OFF
    if (this.remainTime === 0) {
      self.command('setrega', 'STATE', 0)
      clearTimeout(this.valveTimer)
      self.remoteGetValue('STATE')
    }
    this.c_timeRemain.updateValue(this.remainTime, null)
    this.valveTimer = setTimeout(function () {
      self.updateValveTimer()
    }, 1000)
  }

  shutdown () {
    this.log.debug('[SWITCH] shutdown')
    super.shutdown()
    HomeKitGenericService.prototype.shutdown.call(this)
    clearTimeout(this.refreshTimer)
    clearTimeout(this.valveTimer)
  }
}

module.exports = HomeMaticHomeKitSwitchService
