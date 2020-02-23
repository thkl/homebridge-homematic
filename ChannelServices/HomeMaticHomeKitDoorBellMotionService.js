'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
class HomeMaticHomeKitDoorBellMotionService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    this.log.info('Adding DoorBell as Motion Sensor')
    this.sensor = this.getService(Service.MotionSensor)
    this.state = this.sensor.getCharacteristic(Characteristic.MotionDetected)
      .on('get', function (callback) {
        if (callback) callback(null, false)
      })

    this.currentStateCharacteristic['PRESS_SHORT'] = this.state
    this.state.eventEnabled = true
    this.deviceaddress = this.address.slice(0, this.address.indexOf(':'))
  }

  datapointEvent (dp, newValue) {
    let self = this
    if ((this.isDataPointEvent(dp, 'PRESS_SHORT')) && (newValue === true)) {
      this.state.setValue(true, null)
      this.log.debug('Set Motion to true')
      setTimeout(function () {
        self.state.setValue(false, null)
      }, 1000)
    }
  }
}
module.exports = HomeMaticHomeKitDoorBellMotionService
