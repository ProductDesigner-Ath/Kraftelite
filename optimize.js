const fs = require('fs')
const path = require('path')

const ROOT = __dirname

// Collect HTML files: root pages + generated subdirs
const htmlFiles = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(ROOT, f))

for (const dir of ['blog', 'projects', 'services']) {
  const dirPath = path.join(ROOT, dir)
  if (fs.existsSync(dirPath)) {
    for (const f of fs.readdirSync(dirPath)) {
      if (f.endsWith('.html')) htmlFiles.push(path.join(dirPath, f))
    }
  }
}

// Async font link replaces the blocking WebFont.js approach
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&family=Caveat:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap'
const ASYNC_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/><link rel="stylesheet" href="${FONT_URL}" media="print" onload="this.onload=null;this.media='all'"/><noscript><link rel="stylesheet" href="${FONT_URL}"/></noscript>`

function optimize(filePath) {
  let html = fs.readFileSync(filePath, 'utf8')
  const before = html

  // 1. Replace blocking WebFont.js + WebFont.load() with async CSS font link
  html = html.replace(
    /<script src="https:\/\/ajax\.googleapis\.com\/ajax\/libs\/webfont\/[^"]+\/webfont\.js"[^>]*><\/script><script[^>]*>WebFont\.load\(\{[\s\S]*?\}\);<\/script>/,
    ASYNC_FONTS
  )

  // 2. Remove duplicate lenis (keep first, remove second)
  const lenisTag = '<script src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js">'
  const firstLenis = html.indexOf(lenisTag)
  if (firstLenis !== -1) {
    const secondLenis = html.indexOf(lenisTag, firstLenis + 1)
    if (secondLenis !== -1) {
      const endTag = html.indexOf('</script>', secondLenis) + '</script>'.length
      html = html.slice(0, secondLenis) + html.slice(endTag)
    }
  }

  // 3. Add Sanity CDN preconnect if page references Sanity images
  if (html.includes('cdn.sanity.io') && !html.includes('preconnect" href="https://cdn.sanity.io"')) {
    html = html.replace(
      '<link href="https://cdn.prod.website-files.com" rel="preconnect"',
      '<link href="https://cdn.sanity.io" rel="preconnect" crossorigin="anonymous"/><link href="https://cdn.prod.website-files.com" rel="preconnect"'
    )
  }

  // 4. Add loading="lazy" to Webflow CDN images that are missing it
  //    (skip images that already have loading= attribute)
  html = html.replace(
    /<img(?=[^>]*cdn\.prod\.website-files\.com)(?![^>]*\bloading=)([^>]*)(\/?>)/g,
    '<img$1 loading="lazy"$2'
  )

  if (html !== before) {
    fs.writeFileSync(filePath, html)
    console.log(`  ✓ ${path.relative(ROOT, filePath)}`)
  } else {
    console.log(`  - ${path.relative(ROOT, filePath)} (no changes)`)
  }
}

console.log('Optimizing HTML files...')
for (const f of htmlFiles) optimize(f)
console.log(`\n✓ Done (${htmlFiles.length} files)`)
