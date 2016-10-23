const Promise = require('bluebird')
// const ld = require('lodash')
const methods = require('./methods')

module.exports = (actions, config) => {
  let counter = 0
  return Promise.reduce(actions, (previous, item) => {
    const [ method, name ] = item.split(':')
    if (!config[name]) { throw new Error(`${item}: item ${name} not found in config`) }
    const options = Object.assign({}, config.defaults, config[name])
    console.log(`${++counter}: ${method} ${name}`)
    return methods[method](options, previous)
  }, {})
}
