# Changelog

## v0.0.205 (26/01/2020)
*initial auto release* 
---

## Version 0.0.98 (18/03/2018)
See https://github.com/thkl/homebridge-homematic/projects/1 for Changes
---

## Version 0.0.66 (23/01/2017)
some error logging
Fix for Programs with _ etc

---

## Version 0.0.65 (11/01/2017)
fix for Programs and Variables with : _ 
optional autoupdate

---

## Version 0.0.63 (01/01/2017)
fixed Window and Door behaviour

---

## Version 0.0.62 (23/12/2016)
fixed Crash for Single RPC Events

---

## Version 0.0.60 (22/12/2016)
Some small fixes

---

## Version 0.0.59 (11/12/2016)
Fixes CCU Program and Variable Updates

---

## Version 0.0.55 (20/11/2016)
addressed issue 68

---

## Version 0.0.54 (20/11/2016)
added HM-Sec-WDS*
added HM-Sen-DB-PCB

---

## Version 0.0.53 (30/10/2016)
HM-Sec-Sir-WM
WeatherServices
Fixed Dimmer for old hm Systems

---

## Version 0.0.49 (beta) (30/10/2016)
its all about the duty cycle

---

## Version 0.0.47 (29/10/2016)
Dimmer and Bugs

---

## Version 0.0.46 (25/10/2016)
Fixed issuse 53

---

## Version 0.0.45 (16/10/2016)
fixed start value for dimmer , siri will turn the light to 100% after the start of the bridge
added ability to create custom services

---

## Version 0.0.44 (12/10/2016)
HM-LC-RGBW-WM fix for iOS Home App
fixed flickering for Dimmer when change level with the iOS Home App
fixed Door Option for Rotary Handles

---

## Version 0.0.43 (10/10/2016)
- selecting Homematic Channels by an subsection is now mandatory
- added warning if there is no definition of an subsection
- added warning if there are more than 100 devices
- fixed bug in Lux and Rain Sensor Service

---

## Version 0.0.42 (09/10/2016)
Implemented HMIP Devices and Winmatic

Please make sure, you are using the subsection key in your config.json to select the channels of your ccu which you want to import into homekit.
