// IndexNow submitter — tells Bing / Yandex (and ChatGPT Search via Bing) to
// (re)crawl our pages instantly, instead of waiting days for a natural crawl.
//
// How it works: we host a key file at the site root (public/<KEY>.txt). This
// script reads the live sitemap, extracts every URL, and POSTs the list to the
// IndexNow API with that key. Run it after a production deploy:
//
//   npm run indexnow                 # uses www.everlease.fr
//   SITE_URL=https://staging... npm run indexnow
//
// To automate, call it from a Vercel "Deploy Hook" consumer or a GitHub Action
// on push to main. Submitting the same URLs again is harmless.

const KEY = '19b28af812bd667e4ad49de3c1d65f01'
const SITE_URL = (process.env.SITE_URL || 'https://www.everlease.fr').replace(/\/$/, '')
const host = new URL(SITE_URL).host
const keyLocation = `${SITE_URL}/${KEY}.txt`

async function main() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  const res = await fetch(sitemapUrl)
  if (!res.ok) {
    console.error(`Impossible de lire le sitemap (${sitemapUrl}): ${res.status}`)
    process.exit(1)
  }
  const xml = await res.text()
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  if (urlList.length === 0) {
    console.error('Aucune URL trouvée dans le sitemap.')
    process.exit(1)
  }

  const payload = { host, key: KEY, keyLocation, urlList }
  const submit = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })

  // IndexNow renvoie 200 (ou 202) quand la soumission est acceptée.
  console.log(`IndexNow: ${urlList.length} URL soumises → HTTP ${submit.status} ${submit.statusText}`)
  if (submit.status >= 400) {
    console.error(await submit.text())
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
