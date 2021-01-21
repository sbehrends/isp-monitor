var speedTest = require('speedtest-net')
var cron = require('node-cron')
var fetch = require('node-fetch')
var os = require('os')
const Influx = require('influx')
const influxDatabase = process.env.INFLUX_DATABASE || 'network'
const influxUrl = process.env.INFLUX_URL || 'http://root:root@127.0.0.1:8086'
const speedCron = process.env.SPEED_CRON || '0 * * * *'
const influx = new Influx.InfluxDB(`${influxUrl}/${influxDatabase}`)
const hostname = process.env.BALENA_DEVICE_NAME_AT_INIT || os.hostname()

const shouldRunSpeedTest = process.env.SPEED_TEST || false
const shouldRunLvlTest = process.env.LVL_TEST || false

const runSpeedTest = () => {
  var test = speedTest({maxTime: 5000});
  
  test.on('data', data => {
    console.dir(data);
    influx.writePoints([
      {
        measurement: 'speedtest',
        tags: { host: hostname },
        fields: {
          downlink: data.speeds.download,
          uplink: data.speeds.upload,
          ip: data.client.ip,
          isp: data.client.isp,
          serverHost: data.server.host,
          ping: data.server.ping
        },
      }
    ])
  });
  
  test.on('error', err => {
    console.error(err);
  });
}

if (shouldRunSpeedTest) {
  runSpeedTest()
  // Every hour
  cron.schedule('0 * * * *', () => {
    runSpeedTest()
  })
}

/* 
  Modem Signal Test only works for Fibertel ISP provider in Argentina
  Set env var LVL_TEST to turn it on.
 */
const runLvlTest = async () => {
  const req = await fetch('http://provisioning.fibertel.com.ar/asp/nivelesPrima.asp')
  const html = await req.text()
  const matching = html.match(/([0-9,]*) dB/g).map(item => parseFloat(item.replace(' dB', '').replace(',', '.')))
  console.log(matching)
  influx.writePoints([
    {
      measurement: 'signal',
      tags: { host: hostname },
      fields: {
        tx: matching[0],
        rx: matching[1],
        mer: matching[2],
      },
    }
  ])
}

if (shouldRunLvlTest) {
  runLvlTest()
  // Every minute
  cron.schedule('* * * * *', () => {
    runLvlTest()
  })
}
