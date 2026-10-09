import { readFile, watch } from 'node:fs'
import { createServer } from 'node:http'
import { build } from './build.mjs'

const clients = new Set()

watch('.', (_, filename) => {
  if (filename && filename !== 'index.pug') return
  try {
    build()
    console.log('Rebuilt index.pug')
    for (const client of clients) client.write('data: reload\n\n')
  } catch (error) {
    console.error(error)
  }
})

createServer((req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
    res.write(': connected\n\n')
    clients.add(res)
    res.on('close', () => clients.delete(res))
    return
  }
  if (req.url !== '/' && req.url !== '/index.html') {
    res.writeHead(404).end()
    return
  }
  readFile('public/index.html', (error, html) => {
    if (error) return res.writeHead(500).end()
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      .end(html.toString().replace('</body>', '<script>new EventSource("/__reload").onmessage = () => location.reload()</script></body>'))
  })
}).listen(Number(process.env.PORT ?? 8000), '0.0.0.0')
