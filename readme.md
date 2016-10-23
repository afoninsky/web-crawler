# web-crawler
Home project only for myself (automate downloading using simple rules). No descriptions/tests/further support.
```js
const download = require('./src')

const config = {
  defaults: {
    baseUrl: 'http://www.nashe.ru',
    statusCode: 200,
    concurrency: 6
  },
  chartsList: {
    url: '/nashe20/charts',
    map: ['.genre', {
      url: 'attr:href',
      genre: 'text,trim'
    }]
  },
  singleChart: {
    map: ['.item', {
      url: 'attr:data-track-url',
      title: 'find:.artist-song,text,trim'
    }]
  },
  songs: {
    path: 'songs/<%-title%><%-ext%>'
  }
}

const queue = [
  'request:chartsList',
  'parse:chartsList',
  'request:singleChart',
  'parse:singleChart',
  'download:songs'
]
download(queue, config)

```
