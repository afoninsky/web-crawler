const Promise = require('bluebird')
const request = require('request')
const cheerio = require('cheerio')
const assert = require('assert')
const ld = require('lodash')
const fs = require('fs')
const path = require('path')

Promise.promisifyAll(request, {multiArgs: true})


const parseApplyChain = (el, chain) => {
  // 'attr:href,trim' => el.attr('href').trim()
  return chain.split(',').reduce((prevFunc, item) => {
    const [ method, ...arg ] = item.split(':')
    return prevFunc[method](...arg)
  }, ld.cloneDeep(el))
}

const isValidUrl = /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/

const preRequest = _options => {
  const options = Object.assign({}, _options)
  if (options.baseUrl && isValidUrl.test(options.url)) {
    // avoid Error: options.uri must be a path when using options.baseUrl
    options.baseUrl = undefined
  }
  return options
}

const postRequest = (result, options) => {
  if (options.statusCode) {
    assert.ok(result.statusCode === options.statusCode,
      `${options.url} - status code ${result.statusCode} expected, but ${options.statusCode} found`)
  }
}

// https://github.com/request/request#requestoptions-callback
const singleRequest = _options => {
  const options = preRequest(_options)
  console.log('requesting', options.url)
  return request.getAsync(options).then(res => { // [ 'statusCode', 'body', 'headers', 'request' ]
    const response = res[0].toJSON()
    postRequest(response, options)
    return response.body
  })
}

const singleParse = (options, html) => {
  assert.ok(ld.isString(html), 'parse - html expected')
  const $ = cheerio.load(html)
  if (options.map) {
    const [ selector, outputRules ] = options.map
    assert.ok(ld.isString(selector) && ld.isPlainObject(outputRules), 'parse - .map expected in format ["selector", outputRules]')
    return $(selector).map((index, el) => {
      const result = {}
      for (let key in outputRules) {
        result[key] = parseApplyChain($(el), outputRules[key])
      }
      return result
    }).get()
  }
  return Promise.reject('parse - no valid operation found, dont know what return')
}

const singleDownload = (_options) => {
  const options = preRequest(_options)
  const pathTemplate = ld.template(options.path)

  const pathVars = Object.assign({}, path.parse(options.url), options)
  const pathString = pathTemplate(pathVars)
  return new Promise((resolve, reject) => {
    console.log('downloading', options.url)
    request.get(options)
      .on('error', reject)
      .on('response', function(response) {
        postRequest(response, options)
        response.pause()
          .pipe(fs.createWriteStream(pathString))
          .on('finish', resolve)
      })
  })

}

module.exports = {

  request(options, extendedOptions) { // https://github.com/request/request#requestoptions-callback
    assert.ok(ld.isPlainObject(options), 'request - config expected')
    if (!ld.isArray(extendedOptions)) {
      return singleRequest(Object.assign({}, options, extendedOptions))
    }
    const { concurrency } = options
    return Promise.map(extendedOptions.map(item => Object.assign({}, options, item)), singleRequest, { concurrency })
  },

  parse(options, html) {
    assert.ok(ld.isPlainObject(options), 'parse - configexpected')
    if (!ld.isArray(html)) {
      return singleParse(options, html)
    }

    return Promise.map(html, item => singleParse(options, item)).then(ld.flatten)
  },

  download(options, file) {
    assert.ok(ld.isPlainObject(options), 'request - config expected')
    if (!ld.isArray(file)) {
      return singleDownload(Object.assign({}, options, file))
    }
    const { concurrency } = options
    return Promise.map(file.map(item => Object.assign({}, options, item)), singleDownload, { concurrency })
  }

}
