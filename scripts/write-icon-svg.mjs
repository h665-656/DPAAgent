/**
 * Write resources/icon.svg + renderer public icon from build/icon.png
 */
import { readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pngPath = join(root, 'build', 'icon.png')

const png = await sharp(await readFile(pngPath)).resize(256, 256).png().toBuffer()
const b64 = png.toString('base64')
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" width="1024" height="1024">
  <image width="1024" height="1024" href="data:image/png;base64,${b64}" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`
await writeFile(join(root, 'resources', 'icon.svg'), svg)
await writeFile(join(root, 'src', 'renderer', 'public', 'icon.svg'), svg)
console.log('Wrote icon.svg from build/icon.png')
