'use strict'

// (you have to add Channel 8 and 12 of HmIP-BSL

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitBSLColorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    // BLACK , BLUE, GREEN ,TURQUOISE ,RED ,PURPLE ,YELLOW ,WHITE
    this.colorTable = {
      '0': -1,
      '1': 246,
      '2': 111,
      '3': 176,
      '4': 0,
      '5': 319,
      '6': 49,
      '7': 361
    }
    var lightbulb = this.getService(Service.Lightbulb)

    this.onc = lightbulb.getCharacteristic(Characteristic.On)

      .on('get', function (callback) {
        self.query('LEVEL', function (value) {
          if (value === undefined) {
            value = 0
          }
          this.setCache('LAST', value)
          if (callback) callback(null, value > 0)
        })
      })

      .on('set', function (value, callback) {
        var lastLevel = self.getCache('LAST')
        if (lastLevel === undefined) {
          lastLevel = -1
        }

        if (((value === true) || ((value === 1))) && ((lastLevel < 1))) {
          self.setCache('LAST', 100)
          self.command('set', 'LEVEL', 100)
        } else

        if ((value === 0) || (value === false)) {
          self.setCache('LAST', 0)
          self.command('set', 'LEVEL', 0)
        } else

        if (((value === true) || ((value === 1))) && ((lastLevel > 0))) {
          // Do Nothing just skip the ON Command cause the Dimmer is on
        } else {
          self.delayed('set', 'LEVEL', lastLevel, 2)
        }

        callback()
      })

    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

      .on('get', function (callback) {
        self.query('LEVEL', function (value) {
          self.setCache('LAST', (value * 100))
          if (callback) callback(null, value)
        })
      })

      .on('set', function (value, callback) {
        var lastLevel = self.getCache('LAST')
        if (value !== lastLevel) {
          if (value === 0) {
            // set On State
            if ((self.onc !== undefined) && (self.onc.updateValue !== undefined)) {
              this.onc.updateValue(false, null)
            }
          } else {
            if ((self.onc !== undefined) && (self.onc.updateValue !== undefined)) {
              this.onc.updateValue(true, null)
            }
          }

          self.setCache('LAST', value)
          self.isWorking = true
          self.delayed('set', 'LEVEL', value, 5)
        }
        if (callback) callback()
      }.bind(this))

    self.currentStateCharacteristic['LEVEL'] = brightness
    brightness.eventEnabled = true

    this.remoteGetValue('LEVEL')

    var color = lightbulb.addCharacteristic(Characteristic.Hue)

      .on('get', function (callback) {
        self.query('COLOR', function (value) {
          let hkcolor = self.colorTable[value]
          if (callback) callback(null, hkcolor)
        })
      })

      .on('set', function (value, callback) {
        // Check the Color Table
        Object.keys(self.colorTable).forEach(ccuColor => {
          if (value === self.colorTable[ccuColor]) {
            self.delayed('set', 'COLOR', ccuColor, 100)
          }
        })

        callback()
      })

    self.currentStateCharacteristic['COLOR'] = color
    color.eventEnabled = true

    this.remoteGetValue('COLOR')
  }

  endWorking () {
    this.remoteGetValue('LEVEL')
  }
}
module.exports = HomeMaticHomeKitBSLColorService
