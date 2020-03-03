export class ListRow {
  constructor () {
    this.cells = []
  }
  addCell (content) {
    this.cells.push(content)
  }
}

export class List {
  constructor (id, header) {
    this.header = header
    this.rows = []
    this.id = id
  }

  addRow () {
    let row = new ListRow()
    this.rows.push(row)
    return row
  }

  getList () {
    let table = $('<table>').addClass('table').addClass('table-hover')
    let thead = $('<thead>').addClass('text-info')
    table.append(thead)

    this.header.map(header => {
      let th = $('<th>').append(header.label)
      if (header.width) {
        th.attr('style', 'width:' + header.width)
      }
      thead.append(th)
    })

    let tbody = $('<tbody>').attr('id', this.id)
    table.append(tbody)

    this.rows.map(row => {
      let oRow = $('<tr>')
      row.cells.map(cell => {
        oRow.append($('<td>').append(cell))
      })
      tbody.append(oRow)
    })
    return table
  }
}

export class Container {
  constructor () {
    this.items = []
  }

  addItem (id, item) {
    let result = $('<div>').attr('id', id)
    result.append(item)
    this.items.push(result)
    return result
  }

  setItem (id, item) {
    let oBj = $('#' + id)
    if (oBj) {
      oBj.empty()
      oBj.append(item)
    }
  }

  getItems () {
    return this.items
  }
}

export class Dialog {
  constructor (settings) {
    this.dialog = $('<div>').attr('class', 'modal fade').attr('tabindex', '-1').attr('role', 'dialog').attr('id', settings.dialogId)
    let dDocument = $('<div>').attr('class', 'modal-dialog modal-lg').attr('role', 'document')

    if (settings.dialogClass) {
      dDocument.addClass(settings.dialogClass)
    }
    this.dialog.append(dDocument)

    let dContent = $('<div>').addClass('modal-content')
    dDocument.append(dContent)

    let dHeader = $('<div>').addClass('modal-header')
    dContent.append(dHeader)

    if (settings.title) {
      let dTitle = $('<h5>').addClass('modal-title').attr('id', settings.dialogId + '_title')
      dTitle.append(settings.title)
      dHeader.append(dTitle)
    }

    let dCloseButton = $('<button>').attr('type', 'button').attr('class', 'close').attr('data-dismiss', 'modal')
    if (settings.labelClose) {
      dCloseButton.attr('aria-label', settings.labelClose)
    } else {
      dCloseButton.attr('aria-label', 'Close')
    }

    dCloseButton.append($('<span>').attr('aria-hidden', 'true').append('&times;'))
    dHeader.append(dCloseButton)

    this.body = $('<div>').addClass('modal-body').attr('id', settings.dialogId + '_content')
    dContent.append(this.body)

    let dFooter = $('<div>').addClass('modal-footer')
    dContent.append(dFooter)

    settings.buttons.map(button => {
      let btn = $('<button>').attr('type', 'button').addClass('btn')
      if (button.class) {
        btn.addClass(button.class)
      }

      if (button.isPrimary) {
        btn.addClass('btn-primary')
      }

      if (button.isSecondary) {
        btn.addClass('btn-secondary')
      }

      btn.attr('id', button.id)
      btn.append(button.label)

      if (button.dismiss === true) {
        btn.attr('data-dismiss', 'modal')
      }

      if (button.onClick) {
        btn.bind('click', button.onClick)
      }
      dFooter.append(btn)
    })
  }

  setBody (item) {
    let self = this
    this.body.empty()
    if (typeof item === 'object') {
      if (Array.isArray(item)) {
        item.map(iitem => {
          self.body.append(iitem)
        })
      }
    } else {
      this.body.append(item)
    }
  }

  open () {
    let self = this
    $('body').append(this.dialog)

    this.dialog.modal({})
    this.dialog.draggable({
      handle: '.modal-header'
    })

    this.dialog.on('hidden.bs.modal', function (e) {
      setTimeout(function () { self.dialog.remove() }, 50)
    })
  }

  close () {
    this.dialog.modal('hide')
  }
}

export class UI {
  descriptionRow (id, label) {
    let content = $('<div>').addClass('row').attr('style', 'margin-top:10px')
    content.attr('id', id + '_row')
    content.append($('<div>').addClass('col-lg-3 col-md-12'))
    content.append($('<div>').addClass('col-lg-9 col-md-12').append(label))
    return content
  }

  labeledElement (id, label, theElement) {
    let content = $('<div>').addClass('row').attr('style', 'margin-top:10px')
    content.attr('id', id + '_row')
    content.append($('<div>').addClass('col-lg-3 col-md-12').append(label))
    content.append($('<div>').addClass('col-lg-9 col-md-12').append(theElement))
    return content
  }

  labeledInputLine (settings) {
    let oInput = $('<input>')
    oInput.attr('id', settings.id)
    oInput.attr('type', 'text')
    oInput.attr('name', settings.id)
    oInput.attr('style', 'width:100%')
    oInput.val(settings.value || '')
    return this.labeledElement(settings.id, settings.label, oInput)
  }

  labeledCheckbox (settings) {
    let oInput = $('<input>')
    oInput.attr('id', settings.id)
    oInput.attr('type', 'checkbox')
    oInput.attr('name', settings.id)
    oInput.val('true')
    if (settings.value === true) {
      oInput.attr('checked', 'checked')
    }
    return this.labeledElement(settings.id, settings.label, oInput)
  }

  labeledOptionList (settings) {
    let oInput = $('<select>')
    oInput.attr('id', settings.id)
    oInput.attr('type', 'text')
    oInput.attr('name', settings.id)
    oInput.attr('style', 'width:100%')
    settings.options.map(option => {
      let oOp = $('<option>').append(option)
      if (option === settings.value) {
        oOp.attr('selected', 'selected')
      }
      oInput.append(oOp)
    })
    return this.labeledElement(settings.id, settings.label, oInput)
  }

  button (settings) {
    let button = $('<button>').attr('type', settings.type || 'submit').attr('class', settings.class || 'btn btn-info pull-left').append(settings.label)
    if (settings.onClick) {
      button.bind('click', settings.onClick)
    }
    return button
  }
}
