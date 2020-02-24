'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitSpecialSwitchService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    // let channel = this.getClazzConfigValue('channel', undefined)

    // Lightbulb , Outlet , Switch , Fan

    this.switchtype = this.getClazzConfigValue('switchtype', 'Lightbulb')
    let self = this
    this.isMultiChannel = false
    // build interface and address
    /*
    let raw = channel.split(new RegExp('([a-z-]{1,}).([a-z0-9]{1,}):([0-9]{1,})', 'gmi'))
    this.intf = raw[1]
    this.channel = raw[3]
    this.address = this.intf + '.' + raw[2] + ':' + this.channel
    this.log.debug('[SpecialSwitch] Init (%s) at Interface %s address %s Channel %s', this.switchtype, this.intf, this.address, this.channel)
    */
    this.log.debug('[SpSwitch] type is %s', this.switchtype)
    switch (this.switchtype) { // hahaha
      case 'Fan':
        this.service = this.getService(Service.Fan)
        this.addisOnCharacteristic(Characteristic.On)
        break

      case 'Lightbulb':
        this.service = this.getService(Service.Lightbulb)
        this.addisOnCharacteristic(Characteristic.On)
        break

      case 'Outlet':
        this.service = this.getService(Service.Outlet)
        // add InUse
        this.service.getCharacteristic(Characteristic.OutletInUse)
          .on('get', function (callback) {
            callback(null, true)
          })
        this.addisOnCharacteristic(Characteristic.On)
        break

      case 'Switch':
        this.service = this.getService(Service.Switch)
        this.addisOnCharacteristic(Characteristic.On)

        break
    }

    let dpa = this.buildHomeMaticAddress('STATE')
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, self, function (newValue) {
      let hmState = this.isTrue(newValue) ? 1 : 0
      this.onCharacteristic.updateValue(hmState, null)
    })
  }

  addisOnCharacteristic (characteristic) {
    let self = this
    this.onCharacteristic = this.service.getCharacteristic(characteristic)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          let hmState = self.isTrue(value) ? 1 : 0
          if (callback) callback(null, hmState)
        })
      })
      .on('set', function (value, callback) {
        let evtmp = self.eventupdate
        self.eventupdate = false

        self.log.debug('[SpecialSwitch] Set Command %s', value)
        self.command('setrega', 'STATE', (value === true), function () {
          self.eventupdate = evtmp
          if (callback) {
            callback()
          }
        })
      })
  }

  validateConfig (configuration) {
    // things to check
    // switchtype has to be one of this items : 'Outlet', 'Lightbulb', 'Switch', 'Fan'
    return ((configuration) &&
    (configuration.switchtype) &&
    (['Outlet', 'Lightbulb', 'Switch', 'Fan'].indexOf(configuration.switchtype) > -1))
  }

  configItems () {
    return ['switchtype']
  }
}

module.exports = HomeMaticHomeKitSpecialSwitchService
