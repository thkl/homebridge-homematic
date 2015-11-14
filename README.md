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