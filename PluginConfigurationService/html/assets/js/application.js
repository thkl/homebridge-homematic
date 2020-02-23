
export class Application {
  constructor () {
    this.run()
    this.globalServiceList = {}
  }

  makeApiRequest (data) {
    return new Promise((resolve, reject) => {
      $.ajax({
        dataType: 'json',
        url: '/api/',
        data: data,
        success: function (data) {
          resolve(data)
        },
        failure: function (error) {
          reject(error)
        }
      })
    })
  }

  deviceWithAddress (adr) {
    var result
    this.globalDeviceList.map(device => {
      if (device.address === adr) {
        result = device
      }
    })
    return result
  }

  settingsForDeviceAndService (device, serviceName) {
    var result
    device.services.map(service => {
      if (service.service === serviceName) {
        result = service.configuration
      }
    })
    return result
  }

  controlForConfigurationItem (controlName, configurationItem, currentValue) {
    var control
    switch (configurationItem.control) {
      case 'array':
        control = $('<select>')
        configurationItem.values.map(value => {
          let option = $('<option>')
          option.append(value)
          if (value === currentValue) {
            option.attr('selected', 'selected')
          }
          control.append(option)
        })
        break
      case 'text':
        control = $('<input>')
        control.attr('type', 'text')
        control.value(currentValue)
        break
    }
    control.attr('id', 'setting_' + controlName)
    return control
  }

  showServiceDescription (parent, service) {
    parent.empty()
    Object.keys(this.globalServiceList).map(serviceName => {
      if (serviceName === service) {
        parent.append(this.globalServiceList[serviceName].description)
      }
    })
  }

  showSettings (adr) {
    let self = this
    let device = this.deviceWithAddress(adr)
    if (device) {
      $('#settings_title').html('Settings for ' + device.name)

      let content = $('#settings_content')
      content.empty()
      // First show possible Services
      var row = $('<div>').addClass('row')
      content.append(row)
      let c1 = $('<div>').addClass('col-md-3').append('Serviceclass')
      row.append(c1)
      let soption = $('<select>')
      device.services.map(service => {
        let option = $('<option>').append(service.service)
        if (service.service === device.service) {
          option.attr('selected', 'selected')
        }
        soption.append(option)
      })
      let c2 = $('<div>').addClass('col-md-8').append(soption)
      row.append(c2)
      row = $('<div>').addClass('row')
      content.append(row)
      let cD = $('<div>').addClass('col-md-12').addClass('settings_description').attr('id', 'settings_service_description')
      row.append(cD)

      self.showServiceDescription(cD, device.service)

      let settings = this.settingsForDeviceAndService(device, device.service)
      if (settings) {
        settings.map(setting => {
          Object.keys(setting).map(key => {
            let setRow = $('<div>').addClass('row')
            content.append(setRow)

            let cSetting = setting[key]
            let ctrl = self.controlForConfigurationItem(key, cSetting)
            if (ctrl) {
              let oLbl = $('<div>').addClass('col-md-3')
              if (cSetting.label) {
                oLbl.append(cSetting.label)
              } else
              if (cSetting.hint) {
                oLbl.append(cSetting.hint)
              }
              setRow.append(oLbl)
              setRow.append($('<div>').addClass('col-md-8').append(ctrl))
            }
          })
        })
      }

      $('#settings').modal({})
      $('#settings').draggable({
        handle: '.modal-header'
      })
    }
  }

  queryDeviceList () {
    let self = this
    this.makeApiRequest({ method: 'devicelist' }).then(devicelist => {
      if (devicelist) {
        self.globalDeviceList = devicelist
        $('#cnt_mapped_devices').html(devicelist.length)
        let hDeviceList = $('#device_list')
        hDeviceList.empty()
        devicelist.map(device => {
          let hRow = $('<tr>')
          hRow.append($('<td>').append(device.name))
          hRow.append($('<td>').append(device.address))
          hRow.append($('<td>').append(device.service))

          // check config
          if ((device.services.length > 1) || ((device.services[0]) && (device.services[0].configuration.length > 0))) {
            let button = $('<button>').attr('type', 'submit').attr('class', 'btn btn-info pull-left').append('Settings')
            button.bind('click', function () {
              self.showSettings(device.address)
            })
            hRow.append($('<td>').append(button))
          } else {
            hRow.append($('<td>').append(' - '))
          }

          hDeviceList.append(hRow)
        })
      }
    })
  }

  queryInfo () {
    this.makeApiRequest({ method: 'ccu' }).then(info => {
      if (info) {
        $('#ccu_hostname').html(info.ccu_ip)
        $('#ccu_hostname').unbind()
        $('#ccu_hostname').bind('click', function () {
          window.open('http://' + info)
        })
      }
    })
  }

  queryServices () {
    let self = this
    this.makeApiRequest({ method: 'services' }).then(serviceList => {
      if (serviceList) {
        self.globalServiceList = serviceList
      }
    })
  }

  showNotification (from, align, type, icon, message) {
    // type = ['', 'info', 'danger', 'success', 'warning', 'rose', 'primary']

    $.notify({
      icon: icon,
      message: message

    }, {
      type: type,
      timer: 2000,
      placement: {
        from: from,
        align: align
      }
    })
  }

  hookKeys () {
    let self = this
    $('#publish_devices').bind('click', function () {
      self.makeApiRequest({ method: 'reloadApplicances' }).then(result => {
        // wait 30 seconds and then refresh
        self.showNotification('top', 'center', 'info', 'autorenew', 'Homebridge will reload all your selected Homematic Devices...')

        setTimeout(function () {
          self.queryServices()
        }, 30000)
      })
    })
  }

  run () {
    // first query the devices
    this.queryServices()
    this.queryDeviceList()
    this.queryInfo()
    this.hookKeys()
  }
}
