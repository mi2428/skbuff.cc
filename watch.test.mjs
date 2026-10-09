import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'

test('preview rebuilds after index.pug changes', async () => {
  const dir = mkdtempSync(join(resolve('node_modules'), 'skbuff-watch-'))
  const pug = join(dir, 'index.pug')
  const source = (title) => `doctype html\nhtml\n  head\n    title ${title}\n  body\n    main ${title}\n`
  writeFileSync(pug, source('Before'))

  const reservation = createServer().listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const port = reservation.address().port
  await new Promise((resolve) => reservation.close(resolve))

  const server = spawn(process.execPath, [resolve('serve.mjs')], {
    cwd: dir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let stderr = ''
  server.stderr.on('data', (data) => { stderr += data })
  const subscription = new AbortController()

  async function waitFor(title) {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (server.exitCode !== null) throw new Error(stderr || 'preview exited')
      try {
        const response = await fetch(`http://127.0.0.1:${port}`)
        if ((await response.text()).includes(`<title>${title}</title>`)) return
      } catch (error) {
        if (error.cause?.code !== 'ECONNREFUSED') throw error
      }
      await delay(100)
    }
    assert.fail(`Timed out waiting for ${title}: ${stderr}`)
  }

  try {
    await waitFor('Before')
    assert.doesNotMatch(readFileSync(join(dir, 'public/index.html'), 'utf8'), /EventSource/)
    assert.match(await (await fetch(`http://127.0.0.1:${port}`)).text(), /new EventSource\("\/__reload"\)/)
    const events = await fetch(`http://127.0.0.1:${port}/__reload`, { signal: subscription.signal })
    assert.equal(events.headers.get('content-type'), 'text/event-stream')
    const reader = events.body.getReader()
    assert.equal(new TextDecoder().decode((await reader.read()).value), ': connected\n\n')
    const timeout = setTimeout(() => subscription.abort(), 3000)
    try {
      writeFileSync(pug, source('After'))
      assert.match(new TextDecoder().decode((await reader.read()).value), /data: reload\n\n/)
    } finally {
      clearTimeout(timeout)
    }
    await waitFor('After')
    writeFileSync(join(dir, 'replacement.pug'), source('Replaced'))
    renameSync(join(dir, 'replacement.pug'), pug)
    await waitFor('Replaced')
  } finally {
    subscription.abort()
    server.kill()
    if (server.exitCode === null) await once(server, 'exit')
    rmSync(dir, { recursive: true, force: true })
  }
})
