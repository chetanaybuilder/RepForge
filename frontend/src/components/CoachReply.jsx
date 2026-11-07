/**
 * frontend\src\components\CoachReply.jsx
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import React from "react";

function renderInline(text) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="rf-coach-reply-strong">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderTextBlocks(text, segmentIndex) {
  const blocks = [];
  let paragraph = [];
  let bullets = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p className="rf-coach-reply-paragraph" key={`p-${blocks.length}`}>
        {paragraph.map((line, index) => (
          <React.Fragment key={index}>
            {index > 0 && <br />}
            {renderInline(line)}
          </React.Fragment>
        ))}
      </p>
    );
    paragraph = [];
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul className="rf-coach-reply-list" key={`ul-${blocks.length}`}>
        {bullets.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      return;
    }
    const heading = line.match(/^(?:#{1,3}\s+|\d+[.)]\s+)?((?:⚡|📈|🎯).+)$/u);
    if (/^#{1,3}\s+/.test(line) || heading) {
      flushParagraph();
      flushBullets();
      const title = line.replace(/^#{1,3}\s+/, "");
      blocks.push(
        <div className="rf-coach-section-header" key={`h-${blocks.length}`}>
          {renderInline(title)}
        </div>
      );
      return;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
      return;
    }
    flushBullets();
    paragraph.push(line);
  });

  flushParagraph();
  flushBullets();

  return blocks.map((block, index) => (
    <React.Fragment key={`${segmentIndex}-${index}`}>{block}</React.Fragment>
  ));
}

export function CoachReply({ text }) {
  const content =
    typeof text === "string"
      ? text
      : text && typeof text === "object"
        ? text.reply || text.message || text.deep_review || text.text || JSON.stringify(text)
        : String(text ?? "");
  const segments = [];
  const codeBlock = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlock.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return (
    <div className="rf-coach-reply">
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <pre key={index} className="rf-coach-visual-card">
            {segment.content}
          </pre>
        ) : (
          renderTextBlocks(segment.content, index)
        )
      )}
    </div>
  );
}
