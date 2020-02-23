'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitGarageDoorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    let self = this
    this.usecache = false
    this.characteristic = Characteristic

    this.address_sensor_close = this.getClazzConfigValue('address_sensor_close', undefined)
    this.address_sensor_open = this.getClazzConfigValue('address_sensor_open', undefined)

    this.state_sensor_close = this.getClazzConfigValue('state_sensor_close', true)
    this.state_sensor_open = this.getClazzConfigValue('state_sensor_open', true)

    this.address_actor_open = this.getClazzConfigValue('address_actor_open', undefined)
    this.address_actor_close = this.getClazzConfigValue('address_actor_close', undefined)

    this.delay_actor_open = this.getClazzConfigValue('delay_actor_open', 5)
    this.delay_actor_close = this.getClazzConfigValue('delay_actor_close', 5)

    this.message_actor_open = this.getClazzConfigValue('message_actor_open', {
      'on': 1,
      'off': 0
    })
    this.message_actor_close = this.getClazzConfigValue('message_actor_close', {
      'on': 1,
      'off': 0
    })

    this.sensor_requery_time = this.getClazzConfigValue('sensor_requery_time', 30)

    // show configuration
    let twoSensorMode = ((this.address_sensor_close !== undefined) && (this.address_sensor_open !== undefined))
    this.log.debug('[GDS] Garage Door Config: %s sensor mode', twoSensorMode ? 'two' : 'one')
    if (twoSensorMode) {
      this.log.debug('[GDS] Sensor open  is %s', this.address_sensor_open)
      this.log.debug('[GDS] Sensor open value is %s', this.state_sensor_open)
    }
    this.log.debug('[GDS] Sensor close  is %s', this.address_sensor_close)
    this.log.debug('[GDS] Sensor close value is %s', this.state_sensor_close)

    this.targetCommand = false

    // validate stuff
    if (this.isDatapointAddressValid(this.address_sensor_close, false) === false) {
      this.log.error('[GDS] cannot initialize garage device address for close sensor is invalid')
      return
    }

    if (this.isDatapointAddressValid(this.address_sensor_open, true) === false) {
      this.log.error('[GDS] cannot initialize garage device address for open sensor is invalid')
      return
    }

    if (this.isDatapointAddressValid(this.address_actor_open, false) === false) {
      this.log.error('[GDS] cannot initialize garage device address for open actor is invalid')
      return
    }

    if (this.isDatapointAddressValid(this.address_actor_close, true) === false) {
      this.log.error('[GDS] cannot initialize garage device address for close actor is invalid')
      return
    }

    var garagedoorService = this.getService(Service.GarageDoorOpener)
    this.services.push(garagedoorService)

    this.obstacle = garagedoorService.getCharacteristic(Characteristic.ObstructionDetected)
      .on('get', function (callback) {
        if (callback) callback(null, false)
      })

    this.currentDoorState = garagedoorService.getCharacteristic(Characteristic.CurrentDoorState)

      .on('get', function (callback) {
        var returnValue = Characteristic.CurrentDoorState.STOPPED

        if ((self.address_sensor_close !== undefined) && (self.address_sensor_open !== undefined)) {
          // We have two contacts so ask for boath levels
          self.log.debug('[GDS] Two sensor mode. Fetching value for Close Sensor %s', self.address_sensor_close)
          self.remoteGetDataPointValue(self.address_sensor_close, function (closeValue) {
            self.log.debug('[GDS] get close value result is %s', closeValue)
            self.log.debug('[GDS] Fetching value for Open Sensor %s', self.address_sensor_close)
            self.remoteGetDataPointValue(self.address_sensor_open, function (openValue) {
              self.log.debug('[GDS] get open value result is %s', openValue)

              if ((self.didMatch(closeValue, self.state_sensor_close)) && (!self.didMatch(openValue, self.state_sensor_open))) {
                self.log.debug('[GDS] values shows CurrentDoorState is closed')
                returnValue = Characteristic.CurrentDoorState.CLOSED
                if (self.targetCommand) {
                  self.targetDoorState.updateValue(self.characteristic.TargetDoorState.CLOSED, null)
                }
              }

              if ((!self.didMatch(closeValue, self.state_sensor_close)) && (!self.didMatch(openValue, self.state_sensor_open))) {
                returnValue = Characteristic.CurrentDoorState.OPENING // or closing its moving
              }

              if ((!self.didMatch(closeValue, self.state_sensor_close)) && (self.didMatch(openValue, self.state_sensor_open))) {
                returnValue = Characteristic.CurrentDoorState.OPEN
                if (self.targetCommand) {
                  self.targetDoorState.updateValue(self.characteristic.TargetDoorState.OPEN, null)
                }
              }

              if (callback) callback(null, returnValue)
            })
          })
        }

        if ((self.address_sensor_close !== undefined) && (self.address_sensor_open === undefined)) {
          // There is only one contact
          self.log.debug('[GDS] One sensor mode. Fetching value for Close Sensor %s', self.address_sensor_close)

          self.remoteGetDataPointValue(self.address_sensor_close, function (closeValue) {
            self.log.debug('[GDS] get close value result is %s', closeValue)
            if (self.didMatch(closeValue, self.state_sensor_close)) {
              self.log.debug('[GDS] values match close state')
              returnValue = Characteristic.CurrentDoorState.CLOSED
            } else {
              self.log.debug('[GDS] values %s vs %s did not match close state set door to open', closeValue, self.state_sensor_close)
              returnValue = Characteristic.CurrentDoorState.OPEN
            }
            let parts = self.address_sensor_close.split('.')
            if (typeof value === 'number') {
              self.event(parts[0] + '.' + parts[1], parts[2], parseInt(closeValue))
            } else {
              self.event(parts[0] + '.' + parts[1], parts[2], closeValue)
            }
            if (callback) callback(null, returnValue)
          })
        }
      })

    this.targetDoorState = garagedoorService.getCharacteristic(Characteristic.TargetDoorState)
      .on('set', function (value, callback) {
        self.targetCommand = true

        clearTimeout(this.requeryTimer)

        if ((self.address_actor_open !== undefined) && (self.address_actor_close === undefined)) {
          // there is only one actor
          if (value === Characteristic.TargetDoorState.OPEN) {
            self.currentDoorState.updateValue(self.characteristic.CurrentDoorState.OPENING, null)
          } else {
            self.currentDoorState.updateValue(self.characteristic.CurrentDoorState.CLOSING, null)
          }
          self.sendActorMessage(self.address_actor_open, self.message_actor_open['on'])
          self.sendActorMessage(self.address_actor_open, self.message_actor_open['off'], self.delay_actor_open)

          self.requeryTimer = setTimeout(function () {
            // reset Command Switch to override target
            self.targetCommand = false
            self.log.debug('[GDS] garage door requery sensors ...')
            self.querySensors()
          }, 1000 * self.sensor_requery_time)
        } else {
          // there is a actor for every direction so
          if (value === Characteristic.TargetDoorState.OPEN) {
            self.currentDoorState.updateValue(self.characteristic.CurrentDoorState.OPENING, null)
            self.sendActorMessage(self.address_actor_open, self.message_actor_open['on'])
            self.sendActorMessage(self.address_actor_open, self.message_actor_open['off'], self.delay_actor_open)
            // reset Command Switch to override target
            self.targetCommand = false
            self.requeryTimer = setTimeout(function () {
              self.log.debug('[GDS] garage door requery sensors ...')
              self.querySensors()
            }, 1000 * self.sensor_requery_time)
          } else {
            self.currentDoorState.updateValue(self.characteristic.CurrentDoorState.CLOSING, null)
            self.sendActorMessage(self.address_actor_close, self.message_actor_close['on'])
            self.sendActorMessage(self.address_actor_close, self.message_actor_close['off'], self.delay_actor_close)

            // reset Command Switch to override target
            self.targetCommand = false
            self.requeryTimer = setTimeout(function () {
              self.log.debug('[GDS] garage door requery sensors ...')
              self.querySensors()
            }, 1000 * self.sensor_requery_time)
          }
        }
        if (callback) callback()
      }.bind(this))

    this.currentDoorState.eventEnabled = true
    // register for status events

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.address_sensor_close), this, function (newValue) {
      self.datapointEvent(self.transformDatapoint(self.address_sensor_close), newValue)
    })
    if (this.address_sensor_open) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.address_sensor_open), this, function (newValue) {
        self.datapointEvent(self.transformDatapoint(self.address_sensor_open), newValue)
      })
    }

    // this is dirty shit .. ¯\_(ツ)_/¯  it works so we do not change self ...
    // query sensors at launch delayed by 60 seconds
    this.inittimer = setTimeout(function () {
      self.log.debug('[GDS] garage door inital query ...')
      self.querySensors()
    }, 30000)
  }

  sendActorMessage (address, message, delay) {
    let self = this
    if ((message !== undefined) && (address !== undefined)) {
      if (delay === undefined) {
        this.remoteSetDatapointValue(address, message)
      } else {
        setTimeout(function () {
          self.remoteSetDatapointValue(address, message)
        }, 1000 * delay)
      }
    }
  }

  querySensors () {
    let self = this
    self.log.debug('[GDS] Query Sensors')
    if (this.address_sensor_close !== undefined) {
      self.log.debug('[GDS] Close Sensor %s', self.address_sensor_close)
      self.remoteGetDataPointValue(self.address_sensor_close, function (newValue) {
        self.log.debug('[GDS] result for close sensor %s', newValue)
        let parts = self.address_sensor_close.split('.')
        if (typeof value === 'number') {
          self.event(parts[0] + '.' + parts[1], parts[2], parseInt(newValue))
        } else {
          self.event(parts[0] + '.' + parts[1], parts[2], newValue)
        }
      })
    }

    if (this.address_sensor_open !== undefined) {
      self.log.debug('[GDS] Open Sensor %s', self.address_sensor_open)
      this.remoteGetDataPointValue(self.address_sensor_open, function (newValue) {
        self.log.debug('[GDS] result for open sensor %s', newValue)
        let parts = self.address_sensor_close.split('.')
        if (typeof value === 'number') {
          self.event(parts[0] + '.' + parts[1], parts[2], parseInt(newValue))
        } else {
          self.event(parts[0] + '.' + parts[1], parts[2], newValue)
        }
      })
    }
  }

  shutdown () {
    super.shutdown()
    clearTimeout(this.requeryTimer)
    clearTimeout(this.timer)
    clearTimeout(this.inittimer)
  }

  datapointEvent (hmadr, newValue) {
    // Chech sensors
    let self = this
    this.log.debug('[GDS] garage event A:%s|NV:%s|TCS:%s', hmadr.address(), newValue, this.targetCommand)
    let eventAddress = hmadr.address()
    // Kill requery timer

    clearTimeout(this.requeryTimer)

    if ((eventAddress === this.address_sensor_close) || (eventAddress === this.address_sensor_open)) {
      clearTimeout(this.inittimer)
    }

    if ((this.address_sensor_close !== undefined) && (this.address_sensor_open !== undefined)) {
      // we have two sensors
      this.log.debug('[GDS] Two Sensor Mode')
      if ((eventAddress === this.address_sensor_close) && (this.didMatch(newValue, this.state_sensor_close))) {
        // Sensor Close said its closed
        this.log.debug('[GDS] close sensor is %s set CurrentDoorState to close', newValue)
        this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.CLOSED, null)
        this.targetCommand = false
      }

      if ((eventAddress === this.address_sensor_close) && (!(this.didMatch(newValue, this.state_sensor_close)))) {
        // Sensor Close just opened so the door is moving to open position
        this.log.debug('[GDS] close sensor is %s set TargetDoorState to open CurrentDoorState to opening', newValue)
        if (this.targetCommand) {
          this.targetDoorState.updateValue(this.characteristic.TargetDoorState.OPEN)
        }
        this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.OPENING, null)
      }

      if ((eventAddress === this.address_sensor_open) && (this.didMatch(newValue, this.state_sensor_open))) {
        // Sensor Open said its open
        this.log.debug('[GDS] open sensor is %s set CurrentDoorState to open', newValue)
        this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.OPEN, null)
        this.targetCommand = false
      }

      if ((eventAddress === this.address_sensor_open) && (!(this.didMatch(newValue, this.state_sensor_open)))) {
        // Sensor open just went to false so the door is moving to close position
        this.log.debug('[GDS] open sensor is %s set TargetDoorState to close CurrentDoorState to closing', newValue)
        if (this.targetCommand) {
          this.targetDoorState.updateValue(this.characteristic.TargetDoorState.CLOSED)
        }
        this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.CLOSING, null)
      }
    } else {
      this.log.debug('[GDS] One Sensor Mode Close is %s', self.state_sensor_close)
      // we only have one sensor if its the close sensor the door is closed on sensor true
      if (eventAddress === this.address_sensor_close) {
        this.log.debug('[GDS] is sensor Close Event')
        // first set a new target state but ony if the target was not set by homekit first
        if (this.targetCommand === false) {
          let match = this.didMatch(newValue, this.state_sensor_close)
          let newState = (match) ? this.characteristic.TargetDoorState.CLOSED : this.characteristic.TargetDoorState.OPEN
          this.log.debug('Check %s (%s) will match StateSensorClose %s (%s) - %s', newValue, typeof newValue, this.state_sensor_close, typeof this.state_sensor_close, match)
          this.log.debug('[GDS] Close sensor hm value is %s set targetDoorState %s', newValue, newState)
          this.targetDoorState.updateValue(newState, null)
        }
        // wait one second cause we have a really fast going garage door
        this.timer = setTimeout(function () {
          let newState = (self.didMatch(newValue, self.state_sensor_close)) ? self.characteristic.CurrentDoorState.CLOSED : self.characteristic.CurrentDoorState.OPEN
          self.log.debug('[GDS] timer fired close sensor hm value is %s set new current state %s', newValue, newState)
          self.currentDoorState.updateValue(newState, null)
        }, 1000)
      }

      if (eventAddress === this.address_sensor_open) {
        if (this.targetCommand === false) {
          let match = this.didMatch(newValue, this.state_sensor_open)
          let newState = (match) ? this.characteristic.TargetDoorState.OPEN : this.characteristic.TargetDoorState.CLOSED
          this.log.debug('[GDS] open sensor hm value is %s set new target state %s', newValue, newState)
          this.targetDoorState.updateValue(newState, null)
        }

        this.timer = setTimeout(function () {
          let newState = (self.didMatch(newValue, self.state_sensor_open)) ? self.characteristic.CurrentDoorState.OPEN : self.characteristic.CurrentDoorState.CLOSED
          self.log.debug('[GDS] fired open sensor hm value is %s set new state %s', newValue, newState)
          self.currentDoorState.updateValue(newState, null)
        }, 1000)
      }

      this.targetCommand = false
    }
  }
}

module.exports = HomeMaticHomeKitGarageDoorService
