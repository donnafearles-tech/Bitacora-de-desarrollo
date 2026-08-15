import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return <span className="text-gray-400 italic">Sin contenido registrado</span>;

  // Split by code blocks or lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  lines.forEach((line, index) => {
    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const codeText = codeBlockLines.join('\n');
        elements.push(
          <CodeBlockView key={`code-${index}`} code={codeText} language={codeBlockLang || 'text'} />
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '').trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={index} className="text-xs font-mono font-bold text-blue-400 mt-2 mb-1 uppercase tracking-wider">
          {renderInline(line.replace('### ', ''))}
        </h4>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={index} className="text-sm font-mono font-bold text-blue-300 mt-3 mb-1 uppercase tracking-wider">
          {renderInline(line.replace('## ', ''))}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={index} className="text-base font-mono font-extrabold text-white mt-3 mb-1 uppercase tracking-wider">
          {renderInline(line.replace('# ', ''))}
        </h2>
      );
      return;
    }

    // Checkbox lists (- [ ] or - [x])
    if (line.trim().startsWith('- [x]') || line.trim().startsWith('- [X]')) {
      elements.push(
        <div key={index} className="flex items-start gap-2 text-xs text-slate-300 my-0.5">
          <span className="text-emerald-400 font-bold font-mono">☑</span>
          <span className="line-through text-slate-500">{renderInline(line.trim().substring(5))}</span>
        </div>
      );
      return;
    }
    if (line.trim().startsWith('- [ ]')) {
      elements.push(
        <div key={index} className="flex items-start gap-2 text-xs text-slate-300 my-0.5">
          <span className="text-slate-500 font-mono">☐</span>
          <span>{renderInline(line.trim().substring(5))}</span>
        </div>
      );
      return;
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <div key={index} className="flex items-start gap-2 text-xs text-slate-300 my-0.5 ml-1">
          <span className="text-blue-400 leading-none mt-1 font-bold">•</span>
          <span className="flex-1">{renderInline(line.trim().substring(2))}</span>
        </div>
      );
      return;
    }

    // Numbered lists (1. 2. etc)
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={index} className="flex items-start gap-2 text-xs text-slate-300 my-0.5 ml-1">
          <span className="text-blue-400 font-mono font-bold text-[11px]">{numMatch[1]}.</span>
          <span className="flex-1">{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      elements.push(
        <blockquote
          key={index}
          className="border-l-2 border-blue-500 bg-blue-950/20 px-2.5 py-1 text-xs text-slate-300 italic my-1 rounded-r"
        >
          {renderInline(line.trim().substring(2))}
        </blockquote>
      );
      return;
    }

    // Regular line
    if (line.trim() === '') {
      elements.push(<div key={index} className="h-1" />);
      return;
    }

    elements.push(
      <p key={index} className="text-xs text-slate-300 my-1 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  // If ended while still in code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <CodeBlockView
        key="code-end"
        code={codeBlockLines.join('\n')}
        language={codeBlockLang || 'text'}
      />
    );
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
};

// Helper for inline markdown: `code`, **bold**, *italic*, [links]
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code
          key={keyIndex++}
          className="bg-[#111827] text-blue-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#1e293b] mx-0.5"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // Bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={keyIndex++} className="font-bold text-white">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)(\*|_)/);
    if (italicMatch) {
      parts.push(
        <em key={keyIndex++} className="italic text-slate-300">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Plain character
    const nextSpecial = remaining.search(/[`*_]/);
    if (nextSpecial === -1) {
      parts.push(<span key={keyIndex++}>{remaining}</span>);
      break;
    } else if (nextSpecial > 0) {
      parts.push(<span key={keyIndex++}>{remaining.substring(0, nextSpecial)}</span>);
      remaining = remaining.substring(nextSpecial);
    } else {
      parts.push(<span key={keyIndex++}>{remaining[0]}</span>);
      remaining = remaining.substring(1);
    }
  }

  return <>{parts}</>;
}

// Code Block Component with Copy to Clipboard
const CodeBlockView: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded border border-[#1e293b] bg-[#05060a] overflow-hidden font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-3 py-1 bg-[#111827] border-b border-[#1e293b] text-[10px] text-slate-400 font-mono">
        <span className="font-semibold uppercase tracking-wider text-blue-400">
          {language || 'CODE'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-0.5 rounded bg-[#05060a] hover:bg-[#1e293b] border border-[#1e293b] transition"
          title="Copiar código"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-blue-200 font-mono text-[11.5px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};
