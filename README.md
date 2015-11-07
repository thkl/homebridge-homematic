# homebridge-homematic

Supports the Homematic System on HomeBridge Platform

(THIS IS WORK IN PROGRESS) - please use the old legacy Homematic Module if you dont want beta software ...

Devices currently supported:

Switches , Dimmer



# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-homematic
3. Update your configuration file. See sample-config.json in this repository for a sample. 

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
            "programs":[]
        },   
    ]

```