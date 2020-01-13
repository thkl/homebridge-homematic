'use strict'

function Characteristic (hap, char) {
  this.hap = hap
  this.name = char.name
  this.value = ''
}

// Known HomeKit formats
Characteristic.Formats = {
  BOOL: 'bool',
  INT: 'int',
  FLOAT: 'float',
  STRING: 'string',
  ARRAY: 'array', // unconfirmed
  DICTIONARY: 'dictionary', // unconfirmed
  UINT8: 'uint8',
  UINT16: 'uint16',
  UINT32: 'uint32',
  UINT64: 'uint64',
  DATA: 'data', // unconfirmed
  TLV8: 'tlv8'
}

// Known HomeKit unit types
Characteristic.Units = {
  // HomeKit only defines Celsius, for Fahrenheit, it requires iOS app to do the conversion.
  CELSIUS: 'celsius',
  PERCENTAGE: 'percentage',
  ARC_DEGREE: 'arcdegrees',
  LUX: 'lux',
  SECONDS: 'seconds'
}

// Known HomeKit permission types
Characteristic.Perms = {
  READ: 'pr',
  WRITE: 'pw',
  NOTIFY: 'ev',
  HIDDEN: 'hd'
}

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = {
  Characteristic: Characteristic
}

/**
 * Characteristic represents a particular typed variable that can be assigned to a Service. For instance, a
 * "Hue" Characteristic might store a 'float' value of type 'arcdegrees'. You could add the Hue Characteristic
 * to a Service in order to store that value. A particular Characteristic is distinguished from others by its
 * UUID. HomeKit provides a set of known Characteristic UUIDs defined in HomeKitTypes.js along with a
 * corresponding concrete subclass.
 *
 * You can also define custom Characteristics by providing your own UUID. Custom Characteristics can be added
 * to any native or custom Services, but Siri will likely not be able to work with these.
 *
 * Note that you can get the "value" of a Characteristic by accessing the "value" property directly, but this
 * is really a "cached value". If you want to fetch the latest value, which may involve doing some work, then
 * call getValue().
 *
 * @event 'get' => function(callback(err, newValue), context) { }
 *        Emitted when someone calls getValue() on this Characteristic and desires the latest non-cached
 *        value. If there are any listeners to this event, one of them MUST call the callback in order
 *        for the value to ever be delivered. The `context` object is whatever was passed in by the initiator
 *        of this event (for instance whomever called `getValue`).
 *
 * @event 'set' => function(newValue, callback(err), context) { }
 *        Emitted when someone calls setValue() on this Characteristic with a desired new value. If there
 *        are any listeners to this event, one of them MUST call the callback in order for this.value to
 *        actually be set. The `context` object is whatever was passed in by the initiator of this change
 *        (for instance, whomever called `setValue`).
 *
 * @event 'change' => function({ oldValue, newValue, context }) { }
 *        Emitted after a change in our value has occurred. The new value will also be immediately accessible
 *        in this.value. The event object contains the new value as well as the context object originally
 *        passed in by the initiator of this change (if known).
 */

function Characteristic (displayName, UUID, props) {
  this.displayName = displayName
  this.UUID = UUID
  this.iid = null // assigned by our containing Service
  this.value = null
  this.props = props || {
    format: null,
    unit: null,
    minValue: null,
    maxValue: null,
    minStep: null,
    perms: []
  }
}

inherits(Characteristic, EventEmitter)

// Known HomeKit formats
Characteristic.Formats = {
  BOOL: 'bool',
  INT: 'int',
  FLOAT: 'float',
  STRING: 'string',
  ARRAY: 'array', // unconfirmed
  DICTIONARY: 'dictionary', // unconfirmed
  UINT8: 'uint8',
  UINT16: 'uint16',
  UINT32: 'uint32',
  UINT64: 'uint64',
  DATA: 'data', // unconfirmed
  TLV8: 'tlv8'
}

// Known HomeKit unit types
Characteristic.Units = {
  // HomeKit only defines Celsius, for Fahrenheit, it requires iOS app to do the conversion.
  CELSIUS: 'celsius',
  PERCENTAGE: 'percentage',
  ARC_DEGREE: 'arcdegrees',
  LUX: 'lux',
  SECONDS: 'seconds'
}

// Known HomeKit permission types
Characteristic.Perms = {
  READ: 'pr',
  WRITE: 'pw',
  NOTIFY: 'ev',
  HIDDEN: 'hd'
}

/**
 * Copies the given properties to our props member variable,
 * and returns 'this' for chaining.
 *
 * @param 'props' {
 *   format: <one of Characteristic.Formats>,
 *   unit: <one of Characteristic.Units>,
 *   minValue: <minimum value for numeric characteristics>,
 *   maxValue: <maximum value for numeric characteristics>,
 *   minStep: <smallest allowed increment for numeric characteristics>,
 *   perms: array of [Characteristic.Perms] like [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
 * }
 */
Characteristic.prototype.setProps = function (props) {
  for (var key in (props || {})) {
    if (Object.prototype.hasOwnProperty.call(props, key)) { this.props[key] = props[key] }
  }
  return this
}

Characteristic.prototype.getValue = function (callback, context) {
  if (callback) { callback(null, this.value) }
}

Characteristic.prototype.setValue = function (newValue, callback, context) {
  this.value = newValue
  if (callback) callback()
  return this // for chaining
}

Characteristic.prototype.updateValue = function (newValue, callback, context) {
  this.value = newValue
  if (callback) callback()
  return this // for chaining
}

Characteristic.prototype.getDefaultValue = function () {
  switch (this.props.format) {
    case Characteristic.Formats.BOOL: return false
    case Characteristic.Formats.STRING: return ''
    case Characteristic.Formats.ARRAY: return [] // who knows!
    case Characteristic.Formats.DICTIONARY: return {} // who knows!
    case Characteristic.Formats.DATA: return '' // who knows!
    case Characteristic.Formats.TLV8: return '' // who knows!
    default: return this.props.minValue || 0
  }
}

module.exports = {
  Characteristic: Characteristic
}
