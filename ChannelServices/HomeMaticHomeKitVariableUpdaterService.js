'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitVariableUpdaterService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var vup = this.getService(Service.StatelessProgrammableSwitch)
    var cc = vup.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
      .on('set', function (value, callback) {
        // triggerd twice so only react on value = 1
        if ((value === 1) || (value === true)) {
          self.updateVariables()
        }
        if (callback) callback(null, value)
      })

    cc.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('PRESS_SHORT'), this, function (newValue) {
      if (self.isTrue(newValue)) {
        self.updateVariables()
      }
    })
    this.updateVariables()
  }

  updateVariables () {
    // Special is a list of my Variables so create a Rega Request
    let self = this
    var script = ''
    this.special.map(function (variable) {
      script = script + "WriteLine('" + variable + "(---)'#dom.GetObject('" + variable + "').State());"
    })
    self.command('sendregacommand', '', script, function (result) {
      // Parse result an set all Variables
      result.split('\r\n').map(function (tmpvar) {
        var vn = tmpvar.split('(---)')[0]
        var vv = tmpvar.split('(---)')[1]
        if ((vn !== undefined) && (vv !== undefined)) {
          self.log.debug('Update variable %s with %s', vn, vv)
          // send a message to the variable appliance

          self.platform.fireEvent('Var', vn, 1, 'STATE', vv)
        }
      })
    })
  }
}

module.exports = HomeMaticHomeKitVariableUpdaterService
