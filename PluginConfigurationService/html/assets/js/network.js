export class Network {
  makeApiRequest (data) {
    return new Promise((resolve, reject) => {
      $.ajax({
        dataType: 'json',
        url: '/api/',
        data: data,
        method: 'POST',
        success: function (data) {
          console.log('API Request Result' + data)
          resolve(data)
        },
        failure: function (error) {
          reject(error)
        }
      })
    })
  }
}
