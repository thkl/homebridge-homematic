'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitBSLColorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitBSLColorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitBSLColorService, HomeKitGenericService)

HomeMaticHomeKitBSLColorService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  // BLACK , BLUE, GREEN ,TURQUOISE ,RED ,PURPLE ,YELLOW ,WHITE 
  this.colorTable = {'0':-1,'1':246,'2':111,'3':176,'4':0,'5':319,'6':49 ,'7':361}
  var lightbulb = new Service.Lightbulb(this.name)
  this.services.push(lightbulb)

  this.onc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function (callback) {
      that.query('LEVEL', function (value) {
        if (value === undefined) {
          value = 0
        }
       that.state['LAST'] = value
        if (callback) callback(null, value > 0)
      })
    })

    .on('set', function (value, callback) {
      var lastLevel = that.state['LAST']
      if (lastLevel === undefined) {
        lastLevel = -1
      }

      if (((value === true) || ((value === 1))) && ((lastLevel < 1))) {
        that.state['LAST'] = 100
        that.command('set', 'LEVEL', 100)
      } else

      if ((value === 0) || (value === false)) {
        that.state['LAST'] = 0
        that.command('set', 'LEVEL', 0)
      } else

      if (((value === true) || ((value === 1))) && ((lastLevel > 0))) {
        // Do Nothing just skip the ON Command cause the Dimmer is on
      } else {
        that.delayed('set', 'LEVEL', lastLevel, 2)
      }

      callback()
    })

  var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function (callback) {
      that.query('LEVEL', function (value) {
        that.state['LAST'] = (value * 100)
        if (callback) callback(null, value)
      })
    })

    .on('set', function (value, callback) {
      var lastLevel = that.state['LAST']
      if (value !== lastLevel) {
        if (value === 0) {
          // set On State
          if ((that.onc !== undefined) && (that.onc.updateValue !== undefined)) { this.onc.updateValue(false, null) }
        } else {
          if ((that.onc !== undefined) && (that.onc.updateValue !== undefined)) { this.onc.updateValue(true, null) }
        }

        that.state['LAST'] = value
        that.isWorking = true
        that.delayed('set', 'LEVEL', value, 5)
      }
      if (callback) callback()
    }.bind(this))

  that.currentStateCharacteristic['LEVEL'] = brightness
  brightness.eventEnabled = true

  this.remoteGetValue('LEVEL')

  var color = lightbulb.addCharacteristic(Characteristic.Hue)

    .on('get', function (callback) {
      that.query('COLOR', function (value) {
        let hkcolor = that.colorTable[value]
        if (callback) callback(null, hkcolor)
      })
    })

    .on('set', function (value, callback) {
    
      //Check the Color Table
      Object.keys(that.colorTable).forEach(ccuColor => {
        if (value == that.colorTable[ccuColor]) {
          that.delayed('set', 'COLOR', ccuColor, 100)
        }
      });

      callback()
    })

  that.currentStateCharacteristic['COLOR'] = color
  color.eventEnabled = true

  this.remoteGetValue('COLOR')
}

HomeMaticHomeKitBSLColorService.prototype.endWorking = function () {
  this.remoteGetValue('LEVEL')
}

module.exports = HomeMaticHomeKitBSLColorService
