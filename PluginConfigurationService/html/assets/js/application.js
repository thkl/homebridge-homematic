
import { Network } from './network.js'
import { Localization } from './localization.js'
import { UI, Dialog, Container, List, ListRow } from './ui.js'

export class Application {
  constructor () {
    this.network = new Network()
    this.makeApiRequest = this.network.makeApiRequest
    this.ui = new UI()
    var userLang = navigator.language || navigator.userLanguage
    this.localization = new Localization(userLang.toLowerCase())
    this.globalServiceList = {}
    this.run()
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
        control = this.ui.labeledOptionList({
          id: 'service_setting_' + controlName,
          label: this.localization.localize(configurationItem.label),
          options: configurationItem.values,
          value: currentValue[controlName]
        })
        break
      case 'text':
      case 'integer':
        let vdefault = (configurationItem.default !== undefined) ? configurationItem.default : ''
        control = this.ui.labeledInputLine({
          id: 'service_setting_' + controlName,
          label: this.localization.localize(configurationItem.label),
          value: currentValue[controlName] || vdefault
        })
        break
      case 'boolean':
        control = this.ui.labeledCheckbox({
          id: 'service_setting_' + controlName,
          label: this.localization.localize(configurationItem.label),
          value: currentValue[controlName]
        })
        break
    }
    return control
  }

  getServiceDescription (service) {
    var result
    let self = this
    Object.keys(this.globalServiceList).map(serviceName => {
      if (serviceName === service) {
        let description = self.localization.localize(self.globalServiceList[serviceName].description)
        result = self.ui.descriptionRow(serviceName, description)
      }
    })
    return result
  }

  getServiceSettings (device, service) {
    let self = this
    var items = []
    this.currentServiceSettings = this.settingsForDeviceAndService(device, service)
    if (this.currentServiceSettings) {
      this.currentServiceSettings.map(setting => {
        Object.keys(setting).map(key => {
          let cSetting = setting[key]
          let ctrl = self.controlForConfigurationItem(key, cSetting, device.config)
          items.push(ctrl)
          let desc = self.ui.descriptionRow('desc_' + key, self.localization.localize(cSetting.hint))
          items.push(desc)
        })
      })
    }
    return items
  }

  showSettings (adr) {
    let self = this
    let device = this.deviceWithAddress(adr)
    if (device) {
      // First show possible Services
      var avClasses = []
      device.services.map(service => {
        if ((service.special) && (service.special === true)) {
          // Skip this
        } else {
          avClasses.push(service.service)
        }
      })

      let scItem = self.ui.labeledOptionList({
        id: 'service_class',
        label: self.localization.localize('Serviceclass'),
        options: avClasses,
        value: device.service
      })

      let container = new Container()
      container.addItem('service_class_item', scItem)

      let dialog = new Dialog({
        dialogId: 'settings',
        title: self.localization.localize('Settings for %s', device.name),
        buttons: [
          {
            id: 'save',
            label: self.localization.localize('Save settings'),
            isPrimary: true,
            onClick: function (e) {
              self.showNotification('top', 'center', 'info', 'autorenew', self.localization.localize('Please wait until your device was updated'))

              self.saveSettings(device, function () {
                dialog.close()
              })
            }
          },
          {
            isSecondary: true,
            label: 'Cofeve',
            dismiss: true
          }
        ]
      })

      container.addItem('service_class_description', self.getServiceDescription(device.service))
      container.addItem('service_class_settings', self.getServiceSettings(device, device.service))

      dialog.setBody(container.getItems())

      dialog.open()

      let soption = $('#service_class')
      soption.bind('change', function () {
        let newService = soption.val()
        container.setItem('service_class_description', self.getServiceDescription(newService))
        container.setItem('service_class_settings',
          self.getServiceSettings(device, newService)
        )
      })
    }
  }

  async saveSettings (device, callback) {
    let self = this
    if (device) {
      device.service = $('#service_class').val()

      // loop thru currentServiceSettings
      this.currentServiceSettings.map(setting => {
        // get the value
        Object.keys(setting).map(key => {
          let ctrl = setting[key].control
          var setvalue
          switch (ctrl) {
            case 'boolean':
              setvalue = $('#service_setting_' + key).prop('checked')
              break
            case 'integer':
              setvalue = parseInt($('#service_setting_' + key).val())
              break
            default:
              setvalue = $('#service_setting_' + key).val()
              break
          }
          device.config[key] = setvalue
        })
      })

      let data = {
        'address': device.address,
        'service': device.service,
        'config': device.config
      }
      let result = await this.makeApiRequest({ 'method': 'saveSettings', config: JSON.stringify(data) })
      if (result === true) {
        setTimeout(function () {
          self.queryServices()
        }, 10000)
        if (callback) {
          callback()
        }
      }
    }
  }

  async queryDeviceList () {
    let self = this
    let devicelist = await this.makeApiRequest({ method: 'devicelist' })
    if (devicelist) {
      self.globalDeviceList = devicelist
      $('#cnt_mapped_devices').html(devicelist.length)

      var list = new List('_device_list', [
        { width: '30%', label: self.localization.localize('Name') },
        { width: '30%', label: self.localization.localize('Address') },
        { width: '30%', label: self.localization.localize('Serviceclass') },
        { width: '10%', label: '' }
      ])

      var specialList = new List('_device_list_special', [
        { width: '30%', label: self.localization.localize('Name') },
        { width: '50%', label: self.localization.localize('Serviceclass') },
        { width: '10%', label: '' },
        { width: '10%', label: '' }
      ])

      devicelist.map(device => {
        if (device.custom === true) {
          let row = specialList.addRow()
          row.addCell(device.name)
          row.addCell(device.service)
          if ((device.services.length > 1) || ((device.services[0]) && (device.services[0].configuration) && (device.services[0].configuration.length > 0))) {
            let button = self.ui.button({
              label: self.localization.localize('Settings'),
              onClick: function () { self.showSettings(device.address) }
            })

            row.addCell(button)
          } else {
            row.addCell(' - ')
          }

          row.addCell(self.ui.button({
            label: self.localization.localize('Delete'),
            class: 'btn btn-danger pull-left',
            onClick: function () { self.showSettings(device.address) }
          }))
        } else {
          let row = list.addRow()
          row.addCell(device.name)
          row.addCell(device.address)
          row.addCell(device.service)
          if ((device.services.length > 1) || ((device.services[0]) && (device.services[0].configuration) && (device.services[0].configuration.length > 0))) {
            let button = self.ui.button({
              label: self.localization.localize('Settings'),
              onClick: function () { self.showSettings(device.address) }
            })

            row.addCell(button)
          } else {
            row.addCell(' - ')
          }
        }
      })

      let hDeviceList = $('#device_list')
      hDeviceList.empty()
      hDeviceList.append(list.getList())

      let hSpecialDeviceList = $('#device_list_special')
      hSpecialDeviceList.empty()
      hSpecialDeviceList.append(specialList.getList())
    }
  }

  async queryProgramList () {
    let self = this
    let programList = await this.makeApiRequest({ method: 'programlist' })
    if (programList) {
      self.globalProgramList = programList
      let hProgramList = $('#program_list')
      hProgramList.empty()

      let prList = new List('_program_list', [
        { width: '80%', label: self.localization.localize('Program') },
        { width: '20%', label: '' }
      ])

      programList.map(program => {
        let row = prList.addRow()
        row.addCell(program)
        row.addCell(self.ui.button({
          label: self.localization.localize('Delete'),
          class: 'btn btn-danger pull-left',
          onClick: function () { self.deleteProgram(program) }
        }))
      })
      hProgramList.append(prList.getList())
    }
  }

  async queryVariableList () {
    let self = this
    let variableList = await this.makeApiRequest({ method: 'variablelist' })
    if (variableList) {
      self.globalVariableList = variableList
      let hVariableList = $('#variable_list')
      hVariableList.empty()

      let vrList = new List('_variable_list', [
        { width: '80%', label: self.localization.localize('Variable') },
        { width: '20%', label: '' }
      ])

      variableList.map(variable => {
        let row = vrList.addRow()
        row.addCell(variable)
        row.addCell(self.ui.button({
          label: self.localization.localize('Delete'),
          class: 'btn btn-danger pull-left',
          onClick: function () { self.deleteVariable(variable) }
        }))
      })
      hVariableList.append(vrList.getList())
    }
  }

  async queryInfo () {
    let info = await this.makeApiRequest({ method: 'ccu' })
    if (info) {
      $('#ccu_hostname').html(info.ccu_ip)
      $('#ccu_hostname').unbind()
      $('#ccu_hostname').bind('click', function () {
        window.open('http://' + info.ccu_ip)
      })
    }
  }

  deleteProgram (program) {
    let self = this
    let dialog = new Dialog({
      dialogId: 'removeProgram',
      dialogClass: 'modal-danger',
      title: self.localization.localize('Remove %s from HomeKit ?', program),
      buttons: [
        {
          id: 'save',
          label: self.localization.localize('Remove program'),
          isPrimary: true,
          onClick: async function (e) {
            await self.makeApiRequest({ method: 'removeProgram', name: program })
            dialog.close()
            setTimeout(function () {
              self.queryProgramList()
            }, 2000)
          }
        },
        {
          isSecondary: true,
          label: 'Cofeve',
          dismiss: true
        }
      ]
    })
    dialog.setBody(self.localization.localize('This will remove the program from Homekit.You may add %s later again if you want.', program))
    dialog.open()
  }

  deleteVariable (variable) {
    let self = this
    let dialog = new Dialog({
      dialogId: 'removeVariable',
      dialogClass: 'modal-danger',
      title: self.localization.localize('Remove %s from HomeKit ?', variable),
      buttons: [
        {
          id: 'save',
          label: self.localization.localize('Remove variable'),
          isPrimary: true,
          onClick: async function (e) {
            await self.makeApiRequest({ method: 'removeVariable', name: variable })
            dialog.close()
            setTimeout(function () {
              self.queryVariableList()
            }, 2000)
          }

        },
        {
          isSecondary: true,
          label: 'Cofeve',
          dismiss: true
        }
      ]
    })
    dialog.setBody(self.localization.localize('This will remove the variable from Homekit.You may add %s later again if you want.', variable))
    dialog.open()
  }

  openNewVariableDialog () {
    let self = this
    let dialog = new Dialog({
      dialogId: 'newVariable',
      title: self.localization.localize('New variable'),
      buttons: [
        {
          id: 'save',
          label: self.localization.localize('Add new variable'),
          isPrimary: true,
          onClick: function (e) {
            self.saveNewVariable(function () {
              dialog.close()
            })
          }
        },
        {
          isSecondary: true,
          label: 'Cofeve',
          dismiss: true
        }
      ]
    })
    dialog.setBody(self.ui.labeledInputLine({
      id: 'newItemName',
      label: self.localization.localize('Name')
    }))
    dialog.open()
  }

  async saveNewVariable (callback) {
    let self = this
    let varname = $('#newItemName_text').val()
    await this.makeApiRequest({ method: 'newVariable', name: varname })
    setTimeout(function () {
      self.queryVariableList()
    }, 2000)
    if (callback) {
      callback()
    }
  }

  openNewProgramDialog () {
    let self = this
    let dialog = new Dialog({
      dialogId: 'newProgram',
      title: self.localization.localize('New program'),
      buttons: [
        {
          id: 'save',
          label: self.localization.localize('Add new program'),
          isPrimary: true,
          onClick: function (e) {
            self.saveNewProgram(function () {
              dialog.close()
            })
          }
        },
        {
          isSecondary: true,
          label: 'Cofeve',
          dismiss: true
        }
      ]
    })
    dialog.setBody(self.ui.labeledInputLine({
      id: 'newItemName',
      label: self.localization.localize('Name')
    }))
    dialog.open()
  }

  async saveNewProgram (callback) {
    let self = this
    let programName = $('#newItemName_text').val()
    await this.makeApiRequest({ method: 'newProgram', name: programName })
    setTimeout(function () {
      self.queryProgramList()
    }, 2000)
    if (callback) {
      callback()
    }
  }

  async queryServices () {
    let self = this
    let serviceList = await self.makeApiRequest({ method: 'services' })
    if (serviceList) {
      self.globalServiceList = serviceList
      self.specialSericeList = []
      Object.keys(serviceList).map(key => {
        let service = serviceList[key]
        if ((service.special) && (service.special === true)) {
          service.service = key
          self.specialSericeList.push(service)
        }
      })
    }
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

  addNewSpecialService () {
    let self = this
    var options = []

    self.specialSericeList.map(service => {
      options.push(service.service)
    })

    // create a dummy device
    let device = {
      services: self.specialSericeList,
      config: {}
    }

    let container = new Container()

    container.addItem('new_service_name', this.ui.labeledInputLine({
      id: 'service_name',
      label: self.localization.localize('Name')
    }))

    container.addItem('service_class_item', this.ui.labeledOptionList({
      id: 'service_class',
      label: 'Service class',
      options: options
    }))
    let firstServiceName = options[0]
    container.addItem('service_class_settings', self.getServiceSettings(device, firstServiceName))

    let dialog = new Dialog({
      dialogId: 'newService',
      title: self.localization.localize('New special service'),
      buttons: [
        {
          id: 'save',
          label: self.localization.localize('Add new service'),
          isPrimary: true,
          onClick: function (e) {
            self.showNotification('top', 'center', 'info', 'autorenew', self.localization.localize('Please wait until your device was created'))
            device.address = $('#service_name').val()
            self.saveSettings(device, function () {
              dialog.close()
            })
          }
        },
        {
          isSecondary: true,
          label: 'Cofeve',
          dismiss: true
        }
      ]
    })

    dialog.setBody(container.getItems())
    dialog.open()

    let soption = $('#service_class')
    soption.bind('change', function () {
      let newService = soption.val()
      container.setItem('service_class_description', self.getServiceDescription(newService))
      container.setItem('service_class_settings',
        self.getServiceSettings(device, newService)
      )
    })
  }

  hookKeys () {
    let self = this
    $('#publish_devices').bind('click', async function () {
      await self.makeApiRequest({ method: 'reloadApplicances' })
      // wait 30 seconds and then refresh

      self.showNotification('top', 'center', 'info', 'autorenew', self.localization.localize('Homebridge will reload all your selected Homematic Devices.'))

      setTimeout(function () {
        self.queryServices()
      }, 10000)
    })

    $('#buttonNewSpecial').bind('click', function () {
      self.addNewSpecialService()
    })

    $('#buttonNewVariable').bind('click', function () {
      self.openNewVariableDialog()
    })

    $('#buttonNewProgram').bind('click', function () {
      self.openNewProgramDialog()
    })
  }

  async run () {
    await this.localization.init()
    this.localization.localizePage()
    // first query the devices
    this.queryServices()
    this.queryDeviceList()
    this.queryProgramList()
    this.queryVariableList()
    this.queryInfo()
    this.hookKeys()
  }
}
