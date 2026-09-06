import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { CoverLetter } from '@/types/cover-letter';
import type { GeneratedResume } from '@/types/resume';
import { parseCoverLetterMarkdown } from './cover-letter-markdown';
import { splitBold } from './resume-markup';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an elegant, printable A4 HTML representation of a cover letter,
 * styled to match the desktop business-letter export.
 */
export function coverLetterToHtml(
  letter: { title?: string | null; bodyMarkdown: string } | CoverLetter
): string {
  const blocks = parseCoverLetterMarkdown(letter.bodyMarkdown);

  const bodyHtml = blocks
    .map((block) => {
      const linesHtml = block.lines
        .map((line) => {
          return line
            .map((run) => {
              if (run.type === 'bold') {
                return `<strong>${escapeHtml(run.text)}</strong>`;
              }
              if (run.type === 'link') {
                return `<a href="${escapeHtml(run.href)}">${escapeHtml(run.text)}</a>`;
              }
              return escapeHtml(run.text);
            })
            .join('');
        })
        .join('<br />');
      return `<p class="para">${linesHtml}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>${escapeHtml(letter.title || 'Cover Letter')}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    @page {
      size: A4;
      margin: 0;
    }
    html, body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111111;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    body {
      padding: 48pt 56pt;
    }
    .para {
      margin-bottom: 10pt;
    }
    a {
      color: #3b3f9c;
      text-decoration: underline;
    }
    strong {
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

function renderRichHtml(text: string): string {
  const runs = splitBold(text);
  return runs
    .map((r) => (r.bold ? `<strong>${escapeHtml(r.text)}</strong>` : escapeHtml(r.text)))
    .join('');
}

/**
 * Generates an A4 HTML representation of a structured resume, matching the
 * typography and section geometry of the web app's react-pdf output.
 */
export function resumeToHtml(resume: GeneratedResume): string {
  const { basics } = resume.content;
  const contacts: string[] = [];
  if (basics.phone) contacts.push(`<span>${escapeHtml(basics.phone)}</span>`);
  if (basics.email) {
    contacts.push(`<a href="mailto:${escapeHtml(basics.email)}">${escapeHtml(basics.email)}</a>`);
  }
  if (basics.location) contacts.push(`<span>${escapeHtml(basics.location)}</span>`);
  basics.links.forEach((l) => {
    const url = /^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`;
    contacts.push(`<a href="${escapeHtml(url)}">${escapeHtml(l.url)}</a>`);
  });

  const summaryHtml =
    resume.content.summary.trim() !== ''
      ? `<div class="section">
        <div class="section-title">Professional Summary</div>
        <div class="para">${renderRichHtml(resume.content.summary)}</div>
       </div>`
      : '';

  const experienceHtml =
    resume.content.experience.length > 0
      ? `<div class="section">
        <div class="section-title">Experience</div>
        ${resume.content.experience
          .map(
            (e) => `
          <div class="entry">
            <div class="entry-head">
              <span class="bold">${escapeHtml(e.company)}</span>
              <span>${escapeHtml(e.date)}</span>
            </div>
            <div class="title">${escapeHtml(e.title)}</div>
            <div class="bullets">
              ${e.bullets
                .map(
                  (b) => `
                <div class="bullet">
                  <span class="bullet-dot">•</span>
                  <span class="bullet-text">${renderRichHtml(b)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
       </div>`
      : '';

  const projectsHtml =
    resume.content.projects.length > 0
      ? `<div class="section">
        <div class="section-title">Projects</div>
        ${resume.content.projects
          .map(
            (p) => `
          <div class="entry">
            <div class="entry-head">
              <span class="bold">${escapeHtml(p.name)}</span>
              ${p.tagline ? `<span class="italic">${escapeHtml(p.tagline)}</span>` : '<span></span>'}
            </div>
            <div class="bullets">
              ${p.bullets
                .map(
                  (b) => `
                <div class="bullet">
                  <span class="bullet-dot">•</span>
                  <span class="bullet-text">${renderRichHtml(b)}</span>
                </div>
              `
                )
                .join('')}
            </div>
            ${
              p.url
                ? `<div class="project-link"><a href="${escapeHtml(
                    /^https?:\/\//i.test(p.url) ? p.url : `https://${p.url}`
                  )}">${escapeHtml(p.url)}</a></div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
       </div>`
      : '';

  const skillsHtml =
    resume.content.skills.length > 0
      ? `<div class="section">
        <div class="section-title">Skills</div>
        ${resume.content.skills
          .map(
            (g) => `
          <div class="skill-line">
            <span class="bold">${escapeHtml(g.category)}: </span><span>${escapeHtml(
              g.items.join(', ')
            )}</span>
          </div>
        `
          )
          .join('')}
       </div>`
      : '';

  const educationHtml =
    resume.content.education.length > 0
      ? `<div class="section">
        <div class="section-title">Education</div>
        ${resume.content.education
          .map(
            (e) => `
          <div class="education-line">
            <span class="bold">${escapeHtml(e.degree)}, </span><span>${escapeHtml(
              e.institution
            )}${e.period ? ` (${escapeHtml(e.period)})` : ''}</span>
          </div>
        `
          )
          .join('')}
       </div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>${escapeHtml(basics.name)} — Résumé</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    @page {
      size: A4;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.3;
      color: #000000;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    .artboard {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14px 10px 24px 10px;
      width: 100%;
      box-sizing: border-box;
      background-color: #1e293b;
    }
    .zoom-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      color: #f1f5f9;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .zoom-pill:active {
      background: rgba(255, 255, 255, 0.22);
    }
    .sheet-viewport {
      position: relative;
      margin: 0 auto;
      overflow: visible;
    }
    .sheet {
      width: 794px;
      min-height: 1123px;
      box-sizing: border-box;
      padding: 39px 48px;
      background: #ffffff;
      color: #000000;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 1px rgba(0, 0, 0, 0.3);
      border-radius: 2px;
      transform-origin: top left;
      -webkit-transform-origin: top left;
    }
    @media print {
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
      }
      .artboard {
        padding: 0 !important;
        background: #ffffff !important;
        display: block !important;
      }
      .zoom-pill {
        display: none !important;
      }
      .sheet-viewport {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        overflow: visible !important;
      }
      .sheet {
        width: 100% !important;
        min-height: auto !important;
        transform: none !important;
        -webkit-transform: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 29pt 36pt !important;
      }
    }
    .name {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-weight: bold;
      font-size: 22pt;
      line-height: 1.25;
      text-align: center;
      margin-bottom: 6pt;
      color: #000000;
    }
    .contact {
      text-align: center;
      font-size: 8.5pt;
      line-height: 1.3;
      margin-bottom: 10pt;
      color: #222222;
    }
    .contact a {
      color: #0645AD;
      text-decoration: none;
    }
    .section-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-weight: bold;
      font-size: 12pt;
      margin-top: 8pt;
      padding-bottom: 2pt;
      border-bottom: 1pt solid #2B6CB0;
      color: #000000;
    }
    .para {
      margin-top: 3pt;
      font-size: 9.5pt;
      line-height: 1.3;
    }
    .entry-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 5pt;
    }
    .bold {
      font-weight: bold;
    }
    .italic {
      font-style: italic;
    }
    .title {
      margin-top: 1pt;
      font-size: 9.5pt;
    }
    .bullets {
      margin-top: 1pt;
    }
    .bullet {
      display: flex;
      margin-top: 1pt;
      padding-left: 4pt;
    }
    .bullet-dot {
      width: 8pt;
      flex-shrink: 0;
    }
    .bullet-text {
      flex: 1;
      font-size: 9.5pt;
      line-height: 1.3;
    }
    .project-link {
      margin-top: 1pt;
    }
    .project-link a {
      color: #0645AD;
      text-decoration: none;
      font-size: 9.5pt;
    }
    .skill-line, .education-line {
      margin-top: 2pt;
      font-size: 9.5pt;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div id="artboard" class="artboard">
    <div id="zoom-toggle" class="zoom-pill" onclick="toggleZoom()">🔍 Tap to zoom (100%)</div>
    <div id="sheet-viewport" class="sheet-viewport">
      <div id="sheet" class="sheet">
        <div class="name">${escapeHtml(basics.name)}</div>
        ${contacts.length > 0 ? `<div class="contact">${contacts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
        ${summaryHtml}
        ${experienceHtml}
        ${projectsHtml}
        ${skillsHtml}
        ${educationHtml}
      </div>
    </div>
  </div>
  <script>
    (function() {
      var isZoomed = false;

      function applyScale() {
        var sheet = document.getElementById('sheet');
        var viewport = document.getElementById('sheet-viewport');
        var artboard = document.getElementById('artboard');
        var zoomBtn = document.getElementById('zoom-toggle');
        if (!sheet || !viewport || !artboard) return;

        var winWidth = window.innerWidth || document.documentElement.clientWidth || 360;
        var naturalWidth = 794;
        var padding = 20;
        var fitScale = Math.max((winWidth - padding) / naturalWidth, 0.2);

        var scale = isZoomed ? 1.0 : fitScale;

        sheet.style.transform = 'scale(' + scale + ')';
        sheet.style.webkitTransform = 'scale(' + scale + ')';

        var naturalHeight = sheet.offsetHeight || 1123;
        var scaledWidth = isZoomed ? naturalWidth : Math.round(naturalWidth * scale);
        var scaledHeight = Math.round(naturalHeight * scale);

        viewport.style.width = scaledWidth + 'px';
        viewport.style.height = scaledHeight + 'px';

        if (isZoomed) {
          artboard.style.overflowX = 'auto';
          artboard.style.alignItems = 'flex-start';
          artboard.style.padding = '14px 10px 24px 10px';
        } else {
          artboard.style.overflowX = 'hidden';
          artboard.style.alignItems = 'center';
          artboard.style.padding = '14px 10px 24px 10px';
        }

        if (zoomBtn) {
          zoomBtn.textContent = isZoomed ? '🔍 Fit to screen' : '🔍 Tap to zoom (100%)';
        }

        var totalHeight = scaledHeight + 64;
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            height: totalHeight,
            scale: scale,
            isZoomed: isZoomed
          }));
        }
      }

      window.toggleZoom = function() {
        isZoomed = !isZoomed;
        applyScale();
      };

      var sheet = document.getElementById('sheet');
      if (sheet) {
        var lastTap = 0;
        sheet.addEventListener('touchend', function(e) {
          var currentTime = new Date().getTime();
          var tapLength = currentTime - lastTap;
          if (tapLength < 300 && tapLength > 0) {
            window.toggleZoom();
            e.preventDefault();
          }
          lastTap = currentTime;
        });
        sheet.addEventListener('dblclick', function() {
          window.toggleZoom();
        });
      }

      window.addEventListener('load', applyScale);
      window.addEventListener('resize', applyScale);
      document.addEventListener('DOMContentLoaded', applyScale);
      setTimeout(applyScale, 50);
      setTimeout(applyScale, 200);
      setTimeout(applyScale, 500);
    })();
  </script>
</body>
</html>`;

}

/**
 * Generates an on-device PDF file from HTML and launches the native OS share sheet.
 */
export async function shareDocumentPdf(options: {
  title: string;
  html: string;
}): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: options.html,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle: options.title,
  });
}

/**
 * Generates an on-device PDF file from HTML and triggers download or native save.
 */
export async function downloadDocumentPdf(options: {
  title: string;
  html: string;
}): Promise<{ uri: string }> {
  const { uri } = await Print.printToFileAsync({
    html: options.html,
  });

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = uri;
    link.download = `${options.title || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { uri };
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Download ${options.title}`,
    });
  }

  return { uri };
}

