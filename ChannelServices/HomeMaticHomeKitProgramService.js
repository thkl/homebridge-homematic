'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const util = require('util')

class HomeMaticHomeKitProgramService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    Characteristic.ProgramLaunchCharacteristic = function () {
      Characteristic.call(this, 'Program', '5E0115D7-7594-4846-AFB7-F456389E81EC')
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }
    util.inherits(Characteristic.ProgramLaunchCharacteristic, Characteristic)

    Service.ProgramLaunchService = function (displayName, subtype) {
      Service.call(this, displayName, 'B7F46B4D-3D69-4804-8114-393F257D4039', subtype)
      this.addCharacteristic(Characteristic.ProgramLaunchCharacteristic)
    }

    util.inherits(Service.ProgramLaunchService, Service)
  }

  createDeviceService (Service, Characteristic) {
    var self = this
    var prg = this.getService(Service.ProgramLaunchService)

    var pgrl = prg.getCharacteristic(Characteristic.ProgramLaunchCharacteristic)

      .on('get', function (callback) {
        if (callback) callback(null, 0)
      })
      .on('set', function (value, callback) {
        self.log.debug('ProgramLaunchService Event %s', value)
        if ((value === 1) || (value === true)) {
          self.log.debug('Launch Program %s', self.address)
          self.command('sendregacommand', '', 'var x=dom.GetObject(ID_PROGRAMS).Get("' + self.address + '");if (x) {x.ProgramExecute();}', function () {
          })

          setTimeout(function () {
            pgrl.setValue(0, null)
          }, 1000)
        }
        let result = 0
        callback(result)
      })

    pgrl.eventEnabled = true
  }
}

module.exports = HomeMaticHomeKitProgramService
