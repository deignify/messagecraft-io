import React from 'react';

/**
 * Parses WhatsApp-style markdown and returns React elements.
 * Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
export function formatWhatsAppText(text: string): React.ReactNode[] {
  // Order matters: process triple backticks first, then single markers
  const patterns: { regex: RegExp; render: (match: string, key: number) => React.ReactNode }[] = [
    {
      regex: /```([\s\S]*?)```/g,
      render: (match, key) => (
        <code key={key} className="bg-muted/50 px-1 py-0.5 rounded text-[13px] font-mono">
          {match}
        </code>
      ),
    },
    {
      regex: /\*([^\s*](?:[^*]*[^\s*])?)\*/g,
      render: (match, key) => <strong key={key}>{match}</strong>,
    },
    {
      regex: /_([^\s_](?:[^_]*[^\s_])?)_/g,
      render: (match, key) => <em key={key}>{match}</em>,
    },
    {
      regex: /~([^\s~](?:[^~]*[^\s~])?)~/g,
      render: (match, key) => <s key={key}>{match}</s>,
    },
  ];

  let elements: React.ReactNode[] = [text];
  let keyCounter = 0;

  for (const { regex, render } of patterns) {
    const nextElements: React.ReactNode[] = [];
    for (const el of elements) {
      if (typeof el !== 'string') {
        nextElements.push(el);
        continue;
      }
      let lastIndex = 0;
      const localRegex = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;
      while ((match = localRegex.exec(el)) !== null) {
        if (match.index > lastIndex) {
          nextElements.push(el.slice(lastIndex, match.index));
        }
        nextElements.push(render(match[1], keyCounter++));
        lastIndex = localRegex.lastIndex;
      }
      if (lastIndex < el.length) {
        nextElements.push(el.slice(lastIndex));
      }
    }
    elements = nextElements;
  }

  return elements;
}
