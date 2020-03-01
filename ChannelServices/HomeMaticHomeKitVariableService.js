'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitVariableService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.usecache = false
    this.ignoreWorking = true

    var vservice = this.getService(Service.Switch)

    this.cc = vservice.getCharacteristic(Characteristic.On)

      .on('get', function (callback) {
        self.remoteGetValue('STATE', function (value) {
          if (callback) callback(null, value)
        })
      })

      .on('set', function (value, callback) {
        self.log.debug('Variable %s set to %s', self.address, value)
        self.command('sendregacommand', '', 'var x=dom.GetObject("' + self.address + '");if (x) {x.State(' + value + ');}', function () {
          setTimeout(function () {
            self.remoteGetValue('STATE')
          }, 500)
        })

        callback()
      })

    this.cc.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('Var.' + self.address + ':1.STATE'), this, function (newValue) {
      self.log.debug('[Variable] update %s to %s', self.address, newValue)
      self.cc.updateValue(self.isTrue(newValue) ? 1 : 0, null)
    })
  }
}
module.exports = HomeMaticHomeKitVariableService
