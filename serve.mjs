import { readFile } from 'node:fs'
import { createServer } from 'node:http'

createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') {
    res.writeHead(404).end()
    return
  }
  readFile('public/index.html', (error, html) => {
    if (error) return res.writeHead(500).end()
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html)
  })
}).listen(8000, '0.0.0.0')
