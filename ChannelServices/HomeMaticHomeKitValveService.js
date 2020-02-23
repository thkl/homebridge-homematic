'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitValveService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    let self = this
    let channel = this.getClazzConfigValue('channel', undefined)
    // build interface and address
    let raw = channel.split(new RegExp('([a-z-]{1,}).([a-z0-9]{1,}):([0-9]{1,})', 'gmi'))
    this.address = raw[1] + '.' + raw[2] + ':' + raw[3]
    this.interf = raw[1]
    this.log.debug('[VAS] Init Special Valve at Interface %s address %s Channel %s', this.interf, this.address, this.channel)
    var valveService = this.getService(Service.Valve)

    var valveType = valveService.getCharacteristic(Characteristic.ValveType)
      .on('get', function (callback) {
        callback(null, 0)
      })

    valveType.updateValue(0, null)

    this.c_isActive = valveService.getCharacteristic(Characteristic.Active)
      .on('get', function (callback) {
        self.log.debug('get Active')
        self.query('STATE', function (value) {
          let hmState = ((value === 'true') || (value === true)) ? 1 : 0
          if (callback) callback(null, hmState)
        })
      })

      .on('set', function (value, callback) {
        let evtmp = self.eventupdate
        self.eventupdate = false
        self.log.debug('[VAS] Set Command %s', value)
        if (value === 0) {
          self.command('setrega', 'STATE', false)
          self.eventupdate = evtmp
          callback()
        } else {
          self.command('setrega', 'STATE', true)
          self.eventupdate = evtmp
          callback()
        }
      })

    this.c_isActive.updateValue(Characteristic.Active.ACTIVE, null)

    this.c_isInUse = valveService.getCharacteristic(Characteristic.InUse)
      .on('get', function (callback) {
        if (callback) callback(null, self.valvestate)
      })

      .on('set', function (value, callback) {
        callback()
      })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('STATE'), self, function (newValue) {
      let hmState = self.isTrue(newValue)
      self.valvestate = hmState
      let hkvalue = (hmState === true) ? 1 : 0
      self.c_isActive.updateValue(hkvalue, null)
      setTimeout(function () {
        self.c_isInUse.updateValue(hkvalue, null)
      }, 1000)
    })
  }
}

module.exports = HomeMaticHomeKitValveService
