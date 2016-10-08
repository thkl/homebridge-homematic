# homebridge-homematic

Supports the Homematic System on HomeBridge Platform

Devices currently supported:

Switches , Dimmer , RotaryHandles, WindowContacts, MotionSensor, Blinds, Keymatic
ProgramStarter, SmokeDetector, Thermostats ....


# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-homematic
3. Update your configuration file. See the sample below. 

# Configuration

Configuration sample:

 ```
"platforms": [
        {
            "platform": "HomeMatic",
            "name": "HomeMatic CCU",
            "ccu_ip": "192.168.0.100",
            "filter_device":[],
            "filter_channel":["BidCos-RF.KEQXXXXXXX:4", "BidCos-RF.LEQXXXXXXX:2"],
            "outlets":[ "BidCos-RF.KEQXXXXXXX:4","BidCos-RF.IEQXXXXXXX:1"],
            "doors":[],
            "programs":[],
            "subsection":""
        },   
    ]

```


You may optional preselect all the Channels you want to import into Homekit by one Subsection at your CCU.
Create a new Subsection and put all the Channels in you want to import. Finally put the name of the subsection into your config.js


# Variables

You may add binaray variables to Homekit by adding them into your config.json. They will show up as switches.

```
"variables":["VarName1","VarName2]
```

# Programs

If you want to launch Homematic Programs you can also add them to config.json. 
There is a issue with ios10. The build in Home App doesnt handle custom Services so you have to add the ios10 flag in your config.json

```
"programs":["ProgName1","ProgName2"],
"ios10":true
```

# Doors and Windows

Homematic Shutter Contacts will be mapped as Contacts into HomeKit by default. If you want to ask Siri about open Windows, you have to add them to a windows config switch:

So they will be mapped into an motorized Window Device. If you add the channel to the doors configuration switch, this channel will be mapped as automated door.


```
"doors":["BidCos-RF.KEQXXXXXXX:4"]
"windows":["BidCos-RF.KEQXXXXXXX:4"]
```


# HMIP

The following HMIP Devices should work:

* HMIP-PSM (Switch - Part)
* HMIP-PS
* HMIP-SWDO
* HMIP Smoke and Motion Sesors


Please setup HMIP by adding the following key to your config.json

```
"enable_hmip":"true"
```