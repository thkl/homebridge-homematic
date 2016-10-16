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
            "subsection":"Homekit"
        },   
    ]

```


**** BEGINNING OF VERSION 0.0.41 the selection of channels to use with HomeKit via a CCU Subsection is mandatory *****


Preselect all the Channels you want to import into Homekit by one Subsection at your CCU.
Create a new Subsection (in the Sample named as Homekit) and put all the Channels in you want to import. Finally put the name of the subsection into your config.js 

Ports: the plugin will use local Port 9090 to communicate with the ccu rfd daemon. Port 9091 for wired and 9092 for hmip (if they are in use).
If these ports are in use by other applications, you can change them by the following key in your config.json

```
"local_port":8080
```

In this case , please make sure that 8081 and 8082 are also available. You got the point ....


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

# HM-LC-RGBW-WM

Please only add the channel with number 2 to HomeKit.

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

# Troubleshooting

If the Home app on your iOS device cannot connect to the Homebridge after entering the PIN (and just tells you "there was a problem"), this may be caused by too many devices being presented by the bridge. In this case, try to filter some unused devices, e.g. like this if you don't use the "virtual keys":

```
"filter_device":["BidCoS-Wir","BidCoS-RF"]
```


# Custom Serviceclasses

You own a device that is not currently working with the default implementation here? No problem. You can create custom service classes. With a little bit of knowledge from the existing classes in the ChannelServices folder, this should not be a big deal. Copy the HomeMaticHomeKitDummyService and create your own Serviceclass.

All definitions for the existing classes are located in ChannelServices/channel_config.json. There is a key for each Homematic channeltype and the corresponding name of the service class as value. Be Aware: your personal changes in that file will be overridden by the next update. So you have to set them up in your config.json:


As a sample: the device with the channel WEATHER of the device with type HM-WDS10-TH-O will use the service HomeMaticHomeKitCuxDThermostatService

```
"services": [
	{ "type": "HM-WDS10-TH-O:WEATHER",
          "service": "HomeMaticHomeKitCuxDThermostatService"
	}]
	
```

Issue #51

on 15.10.2016 an issue about a missing donation button was reported. So i fixed #51:

<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=DZ5CW7XC9LXMN"><img style="padding:0;" width=74 height=21  src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" alt="Donate!" / border="0"></a>
