/**
 * 纯前端文档转换工具
 * 支持 Markdown 到 DOCX/PDF/HTML 的转换
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, Bookmark, InternalHyperlink } from 'docx';
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import { jsPDF } from 'jspdf';

// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
  .use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' });

/**
 * 模板配置
 */
interface TemplateConfig {
  name: string;
  styles: {
    h1: { fontSize: number; bold: boolean; color: string; alignment?: string; font?: string };
    h2: { fontSize: number; bold: boolean; color: string; font?: string };
    h3: { fontSize: number; bold: boolean; color: string; font?: string };
    body: { fontSize: number; color: string; lineSpacing?: number; font?: string };
    code: { fontSize: number; font: string; background?: string };
  };
}

const TEMPLATES: Record<string, TemplateConfig> = {
  academic: {
    name: '学术论文',
    styles: {
      h1: { fontSize: 32, bold: true, color: '000000', alignment: 'center', font: 'SimSun' },
      h2: { fontSize: 28, bold: true, color: '000000', font: 'SimSun' },
      h3: { fontSize: 24, bold: true, color: '000000', font: 'SimSun' },
      body: { fontSize: 24, color: '000000', lineSpacing: 360, font: 'SimSun' },
      code: { fontSize: 20, font: 'Consolas', background: 'F5F5F5' },
    },
  },
  corporate: {
    name: '企业报告',
    styles: {
      h1: { fontSize: 36, bold: true, color: '000000', font: 'Microsoft YaHei' },
      h2: { fontSize: 28, bold: true, color: '000000', font: 'Microsoft YaHei' },
      h3: { fontSize: 24, bold: true, color: '000000', font: 'Microsoft YaHei' },
      body: { fontSize: 22, color: '000000', lineSpacing: 276, font: 'Microsoft YaHei' },
      code: { fontSize: 20, font: 'Consolas', background: 'F5F5F5' },
    },
  },
  technical: {
    name: '技术手册',
    styles: {
      h1: { fontSize: 32, bold: true, color: '000000', font: 'Arial' },
      h2: { fontSize: 28, bold: true, color: '000000', font: 'Arial' },
      h3: { fontSize: 24, bold: true, color: '000000', font: 'Arial' },
      body: { fontSize: 22, color: '000000', lineSpacing: 288, font: 'Arial' },
      code: { fontSize: 18, font: 'Consolas', background: '1E1E1E' },
    },
  },
  memo: {
    name: '内部备忘',
    styles: {
      h1: { fontSize: 28, bold: true, color: '000000', font: 'SimHei' },
      h2: { fontSize: 24, bold: true, color: '000000', font: 'SimHei' },
      h3: { fontSize: 22, bold: true, color: '000000', font: 'SimHei' },
      body: { fontSize: 22, color: '000000', lineSpacing: 240, font: 'FangSong' },
      code: { fontSize: 20, font: 'Consolas', background: 'F5F5F5' },
    },
  },
};

/**
 * Markdown 转 DOCX
 */
export async function markdownToDocx(
  markdown: string,
  template: string = 'corporate'
): Promise<Blob> {
  const config = TEMPLATES[template] || TEMPLATES.corporate;

  // 提取文献引用
  const references: Array<{id: string; text: string}> = [];
  const refPattern = /^\[\^(\w+)\]:\s*(.+)$/gm;
  let refMatch;
  while ((refMatch = refPattern.exec(markdown)) !== null) {
    references.push({ id: refMatch[1], text: refMatch[2] });
  }

  // 移除文献定义行
  let processedMarkdown = markdown.replace(/^\[\^(\w+)\]:\s*.+$/gm, '');

  // 提取标题用于生成目录
  const headings: Array<{level: number; text: string}> = [];
  const lines = processedMarkdown.split('\n');
  lines.forEach((line) => {
    if (line.startsWith('# ')) {
      headings.push({ level: 1, text: line.substring(2) });
    } else if (line.startsWith('## ')) {
      headings.push({ level: 2, text: line.substring(3) });
    } else if (line.startsWith('### ')) {
      headings.push({ level: 3, text: line.substring(4) });
    }
  });

  // 解析 Markdown
  const paragraphs: Paragraph[] = [];

  // 添加 Word 风格的目录
  if (headings.length > 0) {
    // 目录标题 - 使用 Word 默认目录标题样式
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '目录',
            bold: true,
            size: 28, // 14pt
            color: '000000',
            font: config.styles.body.font,
          }),
        ],
        spacing: { before: 0, after: 200 },
        alignment: AlignmentType.LEFT,
      })
    );
    
    // 添加目录项 - 模仿 Word 自动生成的目录格式
    headings.forEach((h, index) => {
      const indent = (h.level - 1) * 360; // 每级缩进 0.25 英寸
      const pageNumber = index + 1; // 简化的页码
      
      // 创建目录项：标题文本 + 点线 + 页码
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: h.text,
              size: h.level === 1 ? 22 : 20, // H1 稍大
              color: '000000',
              font: config.styles.body.font,
            }),
            new TextRun({
              text: '\t',
              size: 20,
            }),
            new TextRun({
              text: pageNumber.toString(),
              size: 20,
              color: '000000',
              font: config.styles.body.font,
            }),
          ],
          indent: { left: indent },
          spacing: { before: 50, after: 50 },
          alignment: AlignmentType.LEFT,
          // 添加制表位：点线前导符
          tabStops: [
            {
              type: 'right' as any,
              position: 9000, // 右对齐位置
              leader: 'dot' as any, // 点线前导符
            },
          ],
        })
      );
    });
    
    // 目录后添加分页符
    paragraphs.push(new Paragraph({ text: '', pageBreakBefore: true }));
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      // H1 标题 - 不使用预定义样式，直接设置颜色
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(2),
              bold: config.styles.h1.bold,
              size: config.styles.h1.fontSize,
              color: config.styles.h1.color,
              font: config.styles.h1.font,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: config.styles.h1.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (line.startsWith('## ')) {
      // H2 标题 - 不使用预定义样式，直接设置颜色
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(3),
              bold: config.styles.h2.bold,
              size: config.styles.h2.fontSize,
              color: config.styles.h2.color,
              font: config.styles.h2.font,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (line.startsWith('### ')) {
      // H3 标题 - 不使用预定义样式，直接设置颜色
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(4),
              bold: config.styles.h3.bold,
              size: config.styles.h3.fontSize,
              color: config.styles.h3.color,
              font: config.styles.h3.font,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // 列表项
      const children = parseInlineFormatting(line.substring(2), config);
      paragraphs.push(
        new Paragraph({
          children,
          bullet: { level: 0 },
          spacing: { before: 100, after: 100 },
        })
      );
    } else if (line.startsWith('> ')) {
      // 引用
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(2),
              italics: true,
              color: '666666',
              size: config.styles.body.fontSize,
            }),
          ],
          indent: { left: 720 },
          spacing: { before: 100, after: 100 },
        })
      );
    } else if (line.startsWith('```')) {
      // 代码块
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines.join('\n'),
              font: 'Consolas',
              size: config.styles.code.fontSize,
              color: '000000',
            }),
          ],
          shading: {
            fill: config.styles.code.background || 'F5F5F5',
          },
          spacing: { before: 200, after: 200 },
        })
      );
    } else if (line.startsWith('$$')) {
      // 块级数学公式
      const formulaLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('$$')) {
        formulaLines.push(lines[i]);
        i++;
      }
      
      // 转换 LaTeX 为 Unicode
      const formulaText = formulaLines.join(' ');
      const unicodeFormula = convertLatexToUnicode(formulaText);
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: unicodeFormula,
              font: 'Cambria Math',
              size: config.styles.body.fontSize + 4,
              color: '000000',  // 黑色
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
    } else if (line.trim()) {
      // 普通段落 - 处理行内格式和数学公式
      const children = parseInlineFormatting(line, config);
      paragraphs.push(
        new Paragraph({
          children,
          spacing: { before: 100, after: 100 },
        })
      );
    } else {
      // 空行
      paragraphs.push(new Paragraph({ text: '' }));
    }
  }

  // 添加参考文献列表
  if (references.length > 0) {
    // 添加分隔线
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    
    // 添加参考文献标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '参考文献 / References',
            bold: true,
            size: 32,
            color: '000000',
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );

    // 添加每条文献（带书签）
    references.forEach((ref) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new Bookmark({
              id: `ref-${ref.id}`,
              children: [
                new TextRun({
                  text: `[${ref.id}] `,
                  bold: true,
                  size: 20,
                  color: '2563eb',
                }),
              ],
            }),
            new TextRun({
              text: ref.text,
              size: 20,
              color: '374151',
            }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
    });
  }

  // 创建文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // 生成 Blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * 将 LaTeX 公式转换为 Unicode 数学符号（简化版）
 */
function convertLatexToUnicode(latex: string): string {
  let result = latex;
  
  // 常见的数学符号转换
  const replacements: Record<string, string> = {
    '\\int': '∫',
    '\\sum': '∑',
    '\\prod': '∏',
    '\\infty': '∞',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\phi': 'φ',
    '\\omega': 'ω',
    '\\Delta': 'Δ',
    '\\Sigma': 'Σ',
    '\\Omega': 'Ω',
    '\\pm': '±',
    '\\times': '×',
    '\\div': '÷',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\equiv': '≡',
    '\\in': '∈',
    '\\subset': '⊂',
    '\\supset': '⊃',
    '\\cup': '∪',
    '\\cap': '∩',
    '\\emptyset': '∅',
    '\\forall': '∀',
    '\\exists': '∃',
    '\\nabla': '∇',
    '\\partial': '∂',
    '\\sqrt': '√',
  };
  
  // 替换数学符号
  for (const [latex, unicode] of Object.entries(replacements)) {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
  }
  
  // 处理分数 \frac{a}{b} -> (a/b)
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
  
  // 处理上标 ^{n} -> ⁿ (简化处理)
  result = result.replace(/\^2/g, '²');
  result = result.replace(/\^3/g, '³');
  result = result.replace(/\^n/g, 'ⁿ');
  result = result.replace(/\^\{2\}/g, '²');
  result = result.replace(/\^\{3\}/g, '³');
  result = result.replace(/\^\{n\}/g, 'ⁿ');
  result = result.replace(/\^\{-1\}/g, '⁻¹');
  
  // 处理下标 _{n} (保留为普通文本)
  result = result.replace(/_\{([^}]+)\}/g, '₍$1₎');
  result = result.replace(/_([a-zA-Z0-9])/g, '₍$1₎');
  
  // 移除剩余的花括号和反斜杠
  result = result.replace(/[{}\\]/g, '');
  
  // 处理上下限 _{a}^{b} -> [a到b]
  result = result.replace(/₍([^₎]+)₎\^₍([^₎]+)₎/g, '[$1到$2]');
  
  return result.trim();
}

/**
 * 解析行内格式（粗体、斜体、代码、数学公式等）
 */
function parseInlineFormatting(text: string, config: TemplateConfig): Array<TextRun | InternalHyperlink> {
  const runs: Array<TextRun | InternalHyperlink> = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // 行内数学公式 $formula$
    if (text[i] === '$' && text[i + 1] !== '$') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
        currentText = '';
      }
      i++; // skip $
      let formulaText = '';
      while (i < text.length && text[i] !== '$') {
        formulaText += text[i];
        i++;
      }
      i++; // skip closing $
      
      // 转换 LaTeX 为 Unicode
      const unicodeFormula = convertLatexToUnicode(formulaText);
      
      runs.push(
        new TextRun({
          text: unicodeFormula,
          font: 'Cambria Math',
          size: config.styles.body.fontSize,
          color: '000000',  // 黑色
          italics: true,
        })
      );
    }
    // 粗体 **text**
    else if (text.substring(i, i + 2) === '**') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
        currentText = '';
      }
      i += 2;
      let boldText = '';
      while (i < text.length && text.substring(i, i + 2) !== '**') {
        boldText += text[i];
        i++;
      }
      runs.push(new TextRun({ text: boldText, bold: true, size: config.styles.body.fontSize, color: '000000' }));
      i += 2;
    }
    // 斜体 *text*
    else if (text[i] === '*' && text[i + 1] !== '*') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
        currentText = '';
      }
      i++;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i];
        i++;
      }
      runs.push(new TextRun({ text: italicText, italics: true, size: config.styles.body.fontSize, color: '000000' }));
      i++;
    }
    // 行内代码 `code`
    else if (text[i] === '`') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
        currentText = '';
      }
      i++;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i];
        i++;
      }
      runs.push(
        new TextRun({
          text: codeText,
          font: 'Consolas',
          size: config.styles.code.fontSize,
          color: '000000',
          shading: { fill: config.styles.code.background || 'F5F5F5' },
        })
      );
      i++;
    }
    // 文献引用标记 [^1] - 添加内部超链接
    else if (text.substring(i, i + 2) === '[^') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
        currentText = '';
      }
      i += 2; // skip [^
      let refId = '';
      while (i < text.length && text[i] !== ']') {
        refId += text[i];
        i++;
      }
      i++; // skip ]
      
      // 使用 InternalHyperlink 创建可点击的引用
      runs.push(
        new InternalHyperlink({
          anchor: `ref-${refId}`,
          children: [
            new TextRun({
              text: `[${refId}]`,
              superScript: true,
              color: '2563eb',
              size: config.styles.body.fontSize - 4,
              style: 'Hyperlink',
            }),
          ],
        })
      );
    }
    // 链接 [text](url) - 简化处理
    else if (text[i] === '[') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
        currentText = '';
      }
      i++;
      let linkText = '';
      while (i < text.length && text[i] !== ']') {
        linkText += text[i];
        i++;
      }
      i++; // skip ]
      if (text[i] === '(') {
        i++; // skip (
        let url = '';
        while (i < text.length && text[i] !== ')') {
          url += text[i];
          i++;
        }
        i++; // skip )
        runs.push(
          new TextRun({
            text: linkText,
            color: '0000FF',
            underline: { type: UnderlineType.SINGLE },
            size: config.styles.body.fontSize,
          })
        );
      }
    } else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) {
    runs.push(new TextRun({ text: currentText, size: config.styles.body.fontSize, color: '000000' }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: text, size: config.styles.body.fontSize, color: '000000' })];
}

/**
 * Markdown 转 HTML
 */
export function markdownToHtml(markdown: string, template: string = 'corporate'): string {
  const config = TEMPLATES[template] || TEMPLATES.corporate;

  // 渲染 Markdown
  const htmlContent = md.render(markdown);

  // 添加样式
  const css = `
    <style>
      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
      
      body {
        font-family: '${config.styles.body.font}', 'Microsoft YaHei', Arial, sans-serif;
        font-size: ${config.styles.body.fontSize / 2}pt;
        line-height: ${(config.styles.body.lineSpacing || 240) / 240};
        color: #${config.styles.body.color};
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
      }
      
      h1 {
        font-size: ${config.styles.h1.fontSize / 2}pt;
        font-weight: ${config.styles.h1.bold ? 'bold' : 'normal'};
        color: #${config.styles.h1.color};
        text-align: ${config.styles.h1.alignment || 'left'};
        margin: 24px 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #333;
      }
      
      h2 {
        font-size: ${config.styles.h2.fontSize / 2}pt;
        font-weight: ${config.styles.h2.bold ? 'bold' : 'normal'};
        color: #${config.styles.h2.color};
        margin: 20px 0 12px 0;
      }
      
      h3 {
        font-size: ${config.styles.h3.fontSize / 2}pt;
        font-weight: ${config.styles.h3.bold ? 'bold' : 'normal'};
        color: #${config.styles.h3.color};
        margin: 16px 0 10px 0;
      }
      
      p {
        margin: 12px 0;
        text-align: justify;
      }
      
      code {
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: ${config.styles.code.fontSize / 2}pt;
        background-color: #${config.styles.code.background || 'F5F5F5'};
        padding: 2px 6px;
        border-radius: 4px;
      }
      
      pre {
        background-color: #${config.styles.code.background || 'F5F5F5'};
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 16px 0;
      }
      
      pre code {
        background: none;
        padding: 0;
      }
      
      blockquote {
        border-left: 4px solid #ccc;
        padding-left: 16px;
        margin: 16px 0;
        color: #666;
        font-style: italic;
      }
      
      ul, ol {
        padding-left: 24px;
        margin: 12px 0;
      }
      
      li {
        margin: 6px 0;
      }
      
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      
      th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      
      a {
        color: #0066cc;
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      img {
        max-width: 100%;
        height: auto;
        margin: 16px 0;
      }
    </style>
  `;

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      ${css}
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;
}

/**
 * Markdown 转 PDF
 */
export async function markdownToPdf(
  markdown: string,
  template: string = 'corporate'
): Promise<Blob> {
  const config = TEMPLATES[template] || TEMPLATES.corporate;

  // 创建 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // 设置字体（使用内置字体）
  doc.setFont('helvetica');

  let yPosition = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - 2 * margin;

  // 解析 Markdown
  const lines = markdown.split('\n');
  let inBlockFormula = false;
  let formulaLines: string[] = [];

  for (const line of lines) {
    // 检查是否需要新页面
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 40;
    }

    // 处理块级数学公式
    if (line.startsWith('$$')) {
      if (!inBlockFormula) {
        inBlockFormula = true;
        formulaLines = [];
        continue;
      } else {
        // 结束块级公式
        inBlockFormula = false;
        
        // 转换 LaTeX 为 Unicode
        const formulaText = formulaLines.join(' ');
        const unicodeFormula = convertLatexToUnicode(formulaText);
        
        doc.setFontSize(config.styles.body.fontSize / 2 + 2);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(0, 0, 0); // 黑色
        const textLines = doc.splitTextToSize(unicodeFormula, maxWidth);
        doc.text(textLines, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += (config.styles.body.fontSize / 2 + 2) * textLines.length + 16;
        continue;
      }
    }

    if (inBlockFormula) {
      formulaLines.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      // H1 标题
      doc.setFontSize(config.styles.h1.fontSize / 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // 黑色
      const text = line.substring(2);
      const textLines = doc.splitTextToSize(text, maxWidth);
      doc.text(textLines, config.styles.h1.alignment === 'center' ? pageWidth / 2 : margin, yPosition, {
        align: config.styles.h1.alignment === 'center' ? 'center' : 'left',
      });
      yPosition += (config.styles.h1.fontSize / 2) * textLines.length + 20;
    } else if (line.startsWith('## ')) {
      // H2 标题
      doc.setFontSize(config.styles.h2.fontSize / 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // 黑色
      const text = line.substring(3);
      const textLines = doc.splitTextToSize(text, maxWidth);
      doc.text(textLines, margin, yPosition);
      yPosition += (config.styles.h2.fontSize / 2) * textLines.length + 16;
    } else if (line.startsWith('### ')) {
      // H3 标题
      doc.setFontSize(config.styles.h3.fontSize / 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // 黑色
      const text = line.substring(4);
      const textLines = doc.splitTextToSize(text, maxWidth);
      doc.text(textLines, margin, yPosition);
      yPosition += (config.styles.h3.fontSize / 2) * textLines.length + 14;
    } else if (line.trim()) {
      // 普通文本
      doc.setFontSize(config.styles.body.fontSize / 2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // 黑色
      
      // 处理行内数学公式
      let cleanText = line;
      cleanText = cleanText.replace(/\$([^$]+)\$/g, (match, formula) => {
        return convertLatexToUnicode(formula);
      });
      
      // 移除其他 Markdown 格式标记
      cleanText = cleanText
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1');
      
      const textLines = doc.splitTextToSize(cleanText, maxWidth);
      doc.text(textLines, margin, yPosition);
      yPosition += (config.styles.body.fontSize / 2) * textLines.length + 12;
    } else {
      // 空行
      yPosition += 10;
    }
  }

  // 返回 Blob
  return doc.output('blob');
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, fileName: string, extension: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
