'use strict'

const HomeMaticHomeKitDimmerService = require('./HomeMaticHomeKitDimmerService.js')

class HomeMaticHomeKitRGBWService extends HomeMaticHomeKitDimmerService {
  createDeviceService (Service, Characteristic) {
    this.dimmerLevelDatapoint = '1.LEVEL'
    this.dimmerOldLevelDatapoint = '1.OLD_LEVEL'
    this.workingDatapoint = '1.WORKING'

    super.createDeviceService(Service, Characteristic)
    var self = this
    this.isMultiChannel = true
    this.color = this.lightbulb.getCharacteristic(Characteristic.Hue)

      .on('get', function (callback) {
        self.query('2.COLOR', function (value) {
          if (callback) callback(null, value)
        })
      })

      .on('set', function (value, callback) {
        if (self.sat < 10) {
          value = 361.809045226
        }

        self.log.debug('[RGBW] set Hue to %s', value)
        self.delayed('set', '2.COLOR', value, 100)
        callback()
      })

    this.color.eventEnabled = true

    this.csat = this.lightbulb.getCharacteristic(Characteristic.Saturation)
      .on('get', function (callback) {
        self.query('2.COLOR', function (value) {
          var ret = (value === 200) ? 0 : 100
          callback(null, ret)
        })
      })

      .on('set', function (value, callback) {
        self.sat = value
        if (value < 10) {
          self.delayed('set', '2.COLOR', 361.809045226, 100)
        }
        callback()
      })

    this.platform.registeraddressForEventProcessingAtAccessory(self.deviceaddress + ':2.COLOR', self, function (newValue) {
      self.log.debug('[RGBW] event color %s', newValue)
      self.processColorValue(newValue)
    })
  }

  processColorValue (newValue) {
    this.log.debug('[RGBW] processing color %s', newValue)
    this.color.updateValue(newValue, null)
  }
}

module.exports = HomeMaticHomeKitRGBWService
