// Shared renderer for the block-based prose used across the marketing content
// machine (blog articles, pillar/money pages). Keeps one parser + one set of
// block styles so every page type reads identically.
//
// Inline markup inside paragraph/list/table text:
//   [label](/path)  → crawlable <Link> (internal) or <a> (external)
//   **bold**        → <strong>
import React from 'react'
import Link from 'next/link'
import type { ArticleBlock } from '@/lib/seo/blog'

/** Slugify an H2 text into a stable anchor id (table of contents, deep links). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(...renderBold(text.slice(last, m.index), key++))
    const [, label, href] = m
    nodes.push(
      href.startsWith('/') ? (
        <Link key={`l${key++}`} href={href} className="mk-article__link">{label}</Link>
      ) : (
        <a key={`l${key++}`} href={href} className="mk-article__link" rel="noopener">{label}</a>
      ),
    )
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(...renderBold(text.slice(last), key++))
  return nodes
}

function renderBold(text: string, baseKey: number): React.ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={`b${baseKey}-${i}`}>{part}</strong>
      : <React.Fragment key={`t${baseKey}-${i}`}>{part}</React.Fragment>,
  )
}

/** Render an array of content blocks. Headings get an id for anchoring. */
export default function ProseBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return <h2 key={i} id={headingId(block.text)} className="mk-article__h2">{block.text}</h2>
          case 'h3':
            return <h3 key={i} className="mk-article__h3">{block.text}</h3>
          case 'p':
            return <p key={i} className="mk-article__p">{renderInline(block.text)}</p>
          case 'ul':
            return (
              <ul key={i} className="mk-article__ul">
                {block.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
              </ul>
            )
          case 'callout':
            return (
              <div key={i} className="mk-article__callout card">
                {block.title && <div className="mk-article__calltitle">{block.title}</div>}
                <p className="mk-article__callbody">{renderInline(block.text)}</p>
              </div>
            )
          case 'table':
            return (
              <div key={i} className="mk-table__wrap">
                <table className="mk-table">
                  {block.caption && <caption className="mk-article__tablecap">{block.caption}</caption>}
                  <thead>
                    <tr>{block.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          c === 0
                            ? <th key={c} scope="row" className="mk-table__rowhead">{renderInline(cell)}</th>
                            : <td key={c}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          default:
            return null
        }
      })}
    </>
  )
}
