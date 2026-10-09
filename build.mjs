import { mkdirSync, writeFileSync } from 'node:fs'
import pug from 'pug'

const html = pug.renderFile('index.pug')
mkdirSync('public', { recursive: true })
writeFileSync('public/index.html', html)
