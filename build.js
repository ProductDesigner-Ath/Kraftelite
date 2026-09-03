const fs = require('fs')
const path = require('path')
const { createClient } = require('@sanity/client')
const { toHTML } = require('@portabletext/to-html')

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
})

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function imageUrl(ref) {
  if (!ref) return ''
  const match = ref.match(/^image-(.+)-(\d+x\d+)-(\w+)$/)
  if (!match) return ''
  const [, id, dimensions, format] = match
  return `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/production/${id}-${dimensions}.${format}`
}

function renderSections(sections) {
  if (!sections || !sections.length) return ''
  return sections.map(section => {
    if (section._type === 'textBlock') {
      return `<div class="u-rich-text" style="margin:2rem 0">${toHTML(section.content || [])}</div>`
    }
    if (section._type === 'imageBlock') {
      const url = section.image?.asset?._ref ? imageUrl(section.image.asset._ref) : ''
      return url
        ? `<figure style="margin:2rem 0"><img src="${url}" alt="${escapeHtml(section.caption)}" loading="lazy" style="width:100%;border-radius:12px"/>
           ${section.caption ? `<figcaption style="text-align:center;opacity:0.5;margin-top:0.5rem;font-size:0.85rem">${escapeHtml(section.caption)}</figcaption>` : ''}</figure>`
        : ''
    }
    if (section._type === 'videoBlock') {
      return section.url
        ? `<div style="margin:2rem 0"><video src="${section.url}" controls style="width:100%;border-radius:12px"></video>
           ${section.caption ? `<p style="text-align:center;opacity:0.5;margin-top:0.5rem;font-size:0.85rem">${escapeHtml(section.caption)}</p>` : ''}</div>`
        : ''
    }
    return ''
  }).join('\n')
}

function updateListing(filePath, startMarker, endMarker, newContent) {
  let html = fs.readFileSync(filePath, 'utf8')
  const startIdx = html.indexOf(startMarker)
  const endIdx = html.indexOf(endMarker)
  if (startIdx === -1 || endIdx === -1) throw new Error(`CMS markers not found in ${filePath}`)
  const updated = html.slice(0, startIdx + startMarker.length) + '\n' + newContent + '\n' + html.slice(endIdx)
  fs.writeFileSync(filePath, updated)
}

// ── BLOG POSTS ──────────────────────────────────────────────
async function buildBlog() {
  console.log('Fetching blog posts...')
  const posts = await client.fetch(`
    *[_type == "blogPost"] | order(publishedAt desc) {
      title, "slug": slug.current, publishedAt, excerpt,
      "coverRef": coverImage.asset._ref, body
    }
  `)
  console.log(`  Found ${posts.length} blog posts`)

  const template = fs.readFileSync('_templates/blog-post.html', 'utf8')
  fs.mkdirSync('blog', { recursive: true })

  for (const post of posts) {
    const coverUrl = imageUrl(post.coverRef)
    const coverTag = coverUrl
      ? `<img src="${coverUrl}" alt="${escapeHtml(post.title)}" loading="eager" style="width:100%;border-radius:12px;margin-bottom:2.5rem"/>`
      : ''
    const bodyHtml = post.body ? toHTML(post.body) : ''
    const html = template
      .replace(/\{\{TITLE\}\}/g, escapeHtml(post.title))
      .replace(/\{\{DATE\}\}/g, formatDate(post.publishedAt))
      .replace(/\{\{EXCERPT\}\}/g, escapeHtml(post.excerpt || ''))
      .replace(/\{\{COVER_IMAGE_TAG\}\}/g, coverTag)
      .replace(/\{\{BODY\}\}/g, bodyHtml)
    fs.writeFileSync(path.join('blog', `${post.slug}.html`), html)
    console.log(`  → blog/${post.slug}.html`)
  }

  const cards = posts.length === 0
    ? `<p style="opacity:0.5;text-align:center;padding:4rem 0">No posts yet — check back soon.</p>`
    : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2rem;padding:3rem 0">
        ${posts.map(post => {
          const coverUrl = imageUrl(post.coverRef)
          return `<a href="blog/${post.slug}.html" style="text-decoration:none;color:inherit;display:block">
            ${coverUrl ? `<img src="${coverUrl}" alt="${escapeHtml(post.title)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-bottom:1rem"/>` : ''}
            <div style="font-size:0.8rem;opacity:0.4;margin-bottom:0.5rem">${formatDate(post.publishedAt)}</div>
            <h3 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:600">${escapeHtml(post.title)}</h3>
            <p style="opacity:0.6;font-size:0.9rem;margin:0;line-height:1.6">${escapeHtml(post.excerpt || '')}</p>
          </a>`
        }).join('\n')}
      </div>`

  const blogSection = `<section class="u-section"><div class="w-layout-blockcontainer u-container w-container"><div style="padding:2rem 0">${cards}</div></div></section>`
  updateListing('blog.html', '<!-- CMS:BLOG-LISTING-START -->', '<!-- CMS:BLOG-LISTING-END -->', blogSection)
  console.log('  Updated blog.html listing')
}

// ── CASE STUDIES ────────────────────────────────────────────
async function buildProjects() {
  console.log('Fetching case studies...')
  const projects = await client.fetch(`
    *[_type == "caseStudy"] | order(_createdAt desc) {
      title, "slug": slug.current, client, category, summary,
      "coverRef": coverImage.asset._ref, sections
    }
  `)
  console.log(`  Found ${projects.length} case studies`)

  const template = fs.readFileSync('_templates/project.html', 'utf8')

  for (const project of projects) {
    const coverUrl = imageUrl(project.coverRef)
    const sectionsHtml = renderSections(project.sections)
    const content = `
      <div style="max-width:900px;margin:0 auto;padding:4rem 0">
        <div style="margin-bottom:1rem">
          <span style="font-size:0.85rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em">${escapeHtml(project.category || '')}</span>
        </div>
        <h1 class="u-text-style-display u-weight-medium" style="margin-bottom:1rem">${escapeHtml(project.title)}</h1>
        ${project.client ? `<p style="opacity:0.5;margin-bottom:2rem">Client: ${escapeHtml(project.client)}</p>` : ''}
        ${project.summary ? `<p class="u-text-style-main" style="opacity:0.7;font-size:1.1rem;line-height:1.7;margin-bottom:3rem">${escapeHtml(project.summary)}</p>` : ''}
        ${coverUrl ? `<img src="${coverUrl}" alt="${escapeHtml(project.title)}" loading="eager" style="width:100%;border-radius:16px;margin-bottom:3rem"/>` : ''}
        ${sectionsHtml}
      </div>`

    const html = template
      .replace('{{PROJECT_CONTENT}}', content)
      .replace(/\{\{TITLE\}\}/g, escapeHtml(project.title))
    fs.writeFileSync(path.join('projects', `${project.slug}.html`), html)
    console.log(`  → projects/${project.slug}.html`)
  }

  const cards = projects.map(project => {
    const coverUrl = imageUrl(project.coverRef)
    return `<div item-style="" role="listitem" class="work_item w-dyn-item">
      <a href="projects/${project.slug}.html" class="project-card square w-inline-block">
        <div class="project-card-image-wrapper square-2">
          ${coverUrl ? `<img width="70" src="${coverUrl}" alt="${escapeHtml(project.title)}" loading="lazy" class="project-card-image square-3"/>` : ''}
          <div class="project-card-cover square-4">
            <div class="project-card-cover-content square-5">
              <div class="project-card-cover-content-item square-8">
                <div class="project-card-title square-7">${escapeHtml(project.title)}</div>
              </div>
              <div class="project-card-cover-content-item square-8">
                <div class="project-card-subtitle square-9">${escapeHtml(project.category || '')}</div>
              </div>
            </div>
          </div>
          <div class="project-card-cursor-wrapper"><div class="project-card-cursor"><div class="project-card-cursor-text">Take a look</div></div></div>
        </div>
      </a>
    </div>`
  }).join('\n')

  const listingHtml = `<div fs-list-element="list" class="work_wrapper w-dyn-list"><div role="list" class="work_list-2 w-dyn-items">${cards}</div></div>`
  updateListing('projects.html', '<!-- CMS:PROJECTS-LISTING-START -->', '<!-- CMS:PROJECTS-LISTING-END -->', listingHtml)
  console.log('  Updated projects.html listing')
}

// ── SERVICES ────────────────────────────────────────────────
async function buildServices() {
  console.log('Fetching services...')
  const services = await client.fetch(`
    *[_type == "service"] | order(title asc) {
      title, "slug": slug.current, headline, description,
      "heroRef": heroImage.asset._ref, heroVideo, features, sections
    }
  `)
  console.log(`  Found ${services.length} services`)

  const template = fs.readFileSync('_templates/service.html', 'utf8')

  for (const svc of services) {
    const heroUrl = imageUrl(svc.heroRef)
    const sectionsHtml = renderSections(svc.sections)
    const featuresHtml = svc.features && svc.features.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem;margin:3rem 0">
          ${svc.features.map(f => `
            <div style="padding:1.5rem;border:1px solid rgba(255,255,255,0.1);border-radius:12px">
              <h4 style="margin:0 0 0.5rem;font-weight:600">${escapeHtml(f.title || '')}</h4>
              <p style="margin:0;opacity:0.6;font-size:0.9rem;line-height:1.6">${escapeHtml(f.description || '')}</p>
            </div>`).join('\n')}
        </div>`
      : ''

    const content = `
      <div style="max-width:900px;margin:0 auto;padding:4rem 0">
        <h1 class="u-text-style-display u-weight-medium" style="margin-bottom:1rem">${escapeHtml(svc.headline || svc.title)}</h1>
        ${svc.description ? `<p class="u-text-style-main" style="opacity:0.7;font-size:1.1rem;line-height:1.7;margin-bottom:3rem">${escapeHtml(svc.description)}</p>` : ''}
        ${heroUrl ? `<img src="${heroUrl}" alt="${escapeHtml(svc.title)}" loading="eager" style="width:100%;border-radius:16px;margin-bottom:3rem"/>` : ''}
        ${svc.heroVideo ? `<video src="${svc.heroVideo}" controls style="width:100%;border-radius:16px;margin-bottom:3rem"></video>` : ''}
        ${featuresHtml}
        ${sectionsHtml}
      </div>`

    const html = template
      .replace('{{SERVICE_CONTENT}}', content)
      .replace(/\{\{TITLE\}\}/g, escapeHtml(svc.title))
    fs.writeFileSync(path.join('services', `${svc.slug}.html`), html)
    console.log(`  → services/${svc.slug}.html`)
  }
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  if (!process.env.SANITY_PROJECT_ID) {
    console.error('Error: SANITY_PROJECT_ID env var is required')
    process.exit(1)
  }
  await buildBlog()
  await buildProjects()
  await buildServices()
  console.log('\n✓ Build complete')
}

main().catch(err => { console.error(err); process.exit(1) })
