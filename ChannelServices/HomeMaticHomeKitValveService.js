'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const path = require('path')
const fs = require('fs')

class HomeMaticHomeKitValveService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    this.ignoreWorking = true
    this.usecache = false
    this.isMultiChannel = false
    this.delayOnSet = 1000
    var strValveType = this.getClazzConfigValue('valvetype', 'Generic valve')
    // Load ValveType from parameters #268
    // Characteristic.ValveType.GENERIC_VALVE = 0;
    // Characteristic.ValveType.IRRIGATION = 1;
    // Characteristic.ValveType.SHOWER_HEAD = 2;
    // Characteristic.ValveType.WATER_FAUCET = 3;
    this.valveType = 0
    switch (strValveType) {
      case 'Irrigation':
        this.valveType = Characteristic.ValveType.IRRIGATION
        break
      case 'Shower head':
        this.valveType = Characteristic.ValveType.SHOWER_HEAD
        break
      case 'Water faucet':
        this.valveType = Characteristic.ValveType.WATER_FAUCET
        break
      default:
        this.valveType = Characteristic.ValveType.GENERIC_VALVE
        break
    }
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
    this.remainTime = 0
    this.createValveService(Service, Characteristic)
    this.registerEvents()
  }

  createValveService (Service, Characteristic) {
    let self = this
    this.log.debug('[VALVE] generate Valvetype %s', self.valveType)

    this.service_item = this.getService(Service.Valve)
    this.remainTime = -99

    this.configured = this.service_item.getCharacteristic(Characteristic.IsConfigured)
      .on('get', function (callback) {
        callback(null, Characteristic.IsConfigured.CONFIGURED)
      })

    this.configured.updateValue(Characteristic.IsConfigured.CONFIGURED, null)

    this.cValveType = this.service_item.getCharacteristic(Characteristic.ValveType)
      .on('get', function (callback) {
        self.log.debug('[VALVE] get Valvetype %s', self.valveType)
        callback(null, self.valveType)
      })

    setTimeout(function () {
      self.cValveType.updateValue(self.valveType, null)
    }, 1000)

    this.setDurationCharacteristic = this.service_item.getCharacteristic(Characteristic.SetDuration)
      .on('get', function (callback) {
        self.log.debug('[VALVE] get Characteristic.SetDuration')
        callback(null, self.setDuration)
      })

      .on('set', function (value, callback) {
        self.setDuration = value
        self.log.debug('[VALVE] set Characteristic.SetDuration %s', value)

        let strPath = path.join(self.platform.localPath, self.address) + '.json'
        fs.writeFileSync(strPath, JSON.stringify({
          duration: self.setDuration
        }))

        callback()
      })

    this.c_isActive = this.service_item.getCharacteristic(Characteristic.Active)
      .on('get', function (callback) {
        self.log.debug('[VALVE] get Active')
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

  shutdown () {
    this.log.debug('[VALVE] shutdown')
    super.shutdown()
    clearTimeout(this.valveTimer)
  }

  validateConfig (configuration) {
    // things to check
    // valvetype has to be one of this items : 'Generic valve', 'Irrigation', 'Shower head', 'Water faucet'
    return ((configuration) &&
    (configuration.valvetype) &&
    (['Generic valve', 'Irrigation', 'Shower head', 'Water faucet'].indexOf(configuration.valvetype) > -1))
  }

  configItems () {
    return ['valvetype']
  }
}

module.exports = HomeMaticHomeKitValveService
