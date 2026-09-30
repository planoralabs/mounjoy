import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { translations } from './src/translations.js'

// Languages that get their own shareable URL (/en, /pt). Link-preview
// crawlers don't run JS, so each page needs its title/description baked into
// the HTML; the page itself then renders in that language (src/i18n.js).
const LANGUAGE_PAGES = {
  en: { htmlLang: 'en', ogLocale: 'en_US' },
  pt: { htmlLang: 'pt-BR', ogLocale: 'pt_BR' },
}

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const localizeHtml = (html, lang, { htmlLang, ogLocale }) => {
  const { title, description } = translations[lang].meta
  return html
    .replace(/<html lang="[^"]*">/, `<html lang="${htmlLang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`)
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${ogLocale}$2`)
}

const languagePages = () => {
  let outDir
  return {
    name: 'mounjoy-language-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
      for (const [lang, page] of Object.entries(LANGUAGE_PAGES)) {
        fs.mkdirSync(path.join(outDir, lang), { recursive: true })
        fs.writeFileSync(path.join(outDir, lang, 'index.html'), localizeHtml(html, lang, page))
      }
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), languagePages()],
})
