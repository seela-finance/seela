import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticleView from '@/components/marketing/ArticleView'
import { JsonLd, blogPostingSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/jsonld'
import { publishedArticles, getArticle } from '@/lib/seo/blog'

// Static generation — only PUBLISHED articles are prerendered. Drafts are
// never built, listed or indexed (human review gate in lib/seo/blog.ts).
export function generateStaticParams() {
  return publishedArticles().map((a) => ({ slug: a.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}
  const path = `/blog/${article.slug}`
  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      url: path,
      type: 'article',
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const path = `/blog/${article.slug}`

  return (
    <>
      <JsonLd data={blogPostingSchema({
        title: article.metaTitle,
        description: article.metaDescription,
        path,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
      })} />
      {article.faq.length > 0 && <JsonLd data={faqSchema(article.faq)} />}
      <JsonLd data={breadcrumbSchema([
        { name: 'Accueil', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: article.nav, path },
      ])} />
      <ArticleView article={article} />
    </>
  )
}
