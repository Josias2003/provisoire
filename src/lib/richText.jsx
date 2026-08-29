import { Fragment } from 'react'

/**
 * Renders question/option text with lightweight Markdown-style code formatting:
 *   `inline code`      -> <code> span (commands, keywords, file paths, cmdlets)
 *   ```fenced block```  -> <pre><code> block (multi-line CLI output/config)
 * Everything else is rendered as plain text, preserving the surrounding
 * whitespace/newlines via CSS (white-space: pre-wrap on the containing element).
 */
export function renderRichText(text) {
  if (!text) return text

  const blockParts = text.split(/```([\s\S]*?)```/g)
  const nodes = []

  blockParts.forEach((part, i) => {
    if (i % 2 === 1) {
      nodes.push(
        <pre className="code-block" key={`b${i}`}>
          <code>{part.replace(/^\n/, '').replace(/\n$/, '')}</code>
        </pre>
      )
      return
    }

    const inlineParts = part.split(/`([^`\n]+)`/g)
    inlineParts.forEach((seg, j) => {
      if (j % 2 === 1) {
        nodes.push(
          <code className="code-inline" key={`${i}-${j}`}>
            {seg}
          </code>
        )
      } else if (seg) {
        nodes.push(<Fragment key={`${i}-${j}`}>{seg}</Fragment>)
      }
    })
  })

  return nodes
}
