/**
 * Generate pi-desktop app icons from DPA open-chat logo.png
 * (NOT from a UI screenshot — use the real ribbon asset)
 */
import { copyFile, mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = 'F:/Work/DPA-2026/View/MainWindow/Resource/MainIcon/logo.png'
const outBuild = join(root, 'build')
const outRes = join(root, 'resources')
const outPublic = join(root, 'src', 'renderer', 'public')

async function squareIcon(size, outPath, bg = { r: 16, g: 24, b: 40, alpha: 1 }) {
  const pad = Math.round(size * 0.14)
  const inner = size - pad * 2
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const radius = Math.round(size * 0.22)
  const svgBg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="rgb(${bg.r},${bg.g},${bg.b})"/>
    </svg>`,
  )
  await sharp(svgBg)
    .composite([{ input: logo, left: pad, top: pad }])
    .png()
    .toFile(outPath)
  console.log('Wrote', outPath)
}

async function main() {
  await mkdir(outBuild, { recursive: true })
  await mkdir(outPublic, { recursive: true })

  // UI mark: transparent logo only
  await sharp(src)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outPublic, 'app-icon.png'))

  await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outRes, 'icon-content.png'))

  await squareIcon(1024, join(outBuild, 'icon.png'))
  await squareIcon(512, join(outRes, 'icon-512.png'))
  await squareIcon(256, join(outRes, 'icon-256.png'))
  await copyFile(join(outBuild, 'icon.png'), join(outRes, 'icon.png'))

  for (const s of [16, 32, 48, 64, 128, 256]) {
    await squareIcon(s, join(outBuild, `icon-${s}.png`))
  }

  const png256 = await sharp(join(outBuild, 'icon.png')).resize(256, 256).png().toBuffer()
  const b64 = png256.toString('base64')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" width="1024" height="1024">
  <image width="1024" height="1024" href="data:image/png;base64,${b64}" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`
  await writeFile(join(outRes, 'icon.svg'), svg)
  await writeFile(join(outPublic, 'icon.svg'), svg)
  console.log('done — icons from DPA logo.png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
