import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PdfReportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
}

@Injectable()
export class ReportsPdfService {
  private readonly primaryColor = rgb(30 / 255, 58 / 255, 138 / 255); // #1e3a8a
  private readonly accentColor = rgb(59 / 255, 130 / 255, 246 / 255); // #3b82f6
  private readonly textColor = rgb(30 / 255, 41 / 255, 59 / 255); // #1e293b
  private readonly lightGray = rgb(241 / 255, 245 / 255, 249 / 255); // #f1f5f9

  async generateReport(options: PdfReportOptions): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 width
    const pageHeight = 841.89; // A4 height
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // --- Cabeçalho ---
    page.drawRectangle({
      x: 0,
      y: pageHeight - 80,
      width: pageWidth,
      height: 80,
      color: this.primaryColor,
    });

    page.drawText('SoloFlow', {
      x: margin,
      y: pageHeight - 35,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('Gestao de Processos', {
      x: margin,
      y: pageHeight - 55,
      size: 10,
      font,
      color: rgb(0.8, 0.85, 1),
    });

    // Data de geração
    const now = new Date();
    const dateStr = `Gerado em: ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const dateWidth = font.widthOfTextAtSize(dateStr, 9);
    page.drawText(dateStr, {
      x: pageWidth - margin - dateWidth,
      y: pageHeight - 50,
      size: 9,
      font,
      color: rgb(0.8, 0.85, 1),
    });

    yPosition = pageHeight - 110;

    // --- Título do relatório ---
    page.drawText(options.title, {
      x: margin,
      y: yPosition,
      size: 16,
      font: fontBold,
      color: this.primaryColor,
    });
    yPosition -= 20;

    if (options.subtitle) {
      page.drawText(options.subtitle, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
        color: this.textColor,
      });
      yPosition -= 15;
    }

    yPosition -= 15;

    // --- Tabela ---
    const colCount = options.headers.length;
    const colWidth = contentWidth / colCount;
    const rowHeight = 22;

    // Cabeçalho da tabela
    page.drawRectangle({
      x: margin,
      y: yPosition - rowHeight + 5,
      width: contentWidth,
      height: rowHeight,
      color: this.accentColor,
    });

    for (let i = 0; i < colCount; i++) {
      const text = this.truncateText(options.headers[i], font, 8, colWidth - 10);
      page.drawText(text, {
        x: margin + i * colWidth + 5,
        y: yPosition - 10,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    yPosition -= rowHeight;

    // Linhas da tabela
    for (let rowIdx = 0; rowIdx < options.rows.length; rowIdx++) {
      // Verificar se precisa de nova página
      if (yPosition - rowHeight < margin + 40) {
        // Rodapé na página atual
        this.drawFooter(page, font, pageWidth, margin);

        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      // Fundo alternado
      if (rowIdx % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: yPosition - rowHeight + 5,
          width: contentWidth,
          height: rowHeight,
          color: this.lightGray,
        });
      }

      const row = options.rows[rowIdx];
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const cellText = row[colIdx] || '';
        const text = this.truncateText(cellText, font, 8, colWidth - 10);
        page.drawText(text, {
          x: margin + colIdx * colWidth + 5,
          y: yPosition - 10,
          size: 8,
          font,
          color: this.textColor,
        });
      }

      yPosition -= rowHeight;
    }

    // Rodapé
    this.drawFooter(page, font, pageWidth, margin);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private drawFooter(page: any, font: any, pageWidth: number, margin: number) {
    const footerY = 30;
    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: pageWidth - margin, y: footerY + 10 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText('SoloFlow - Gestao de Processos', {
      x: margin,
      y: footerY,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  private truncateText(text: string, font: any, size: number, maxWidth: number): string {
    if (!text) return '';
    let truncated = text;
    while (font.widthOfTextAtSize(truncated, size) > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    if (truncated.length < text.length && truncated.length > 3) {
      truncated = truncated.slice(0, -3) + '...';
    }
    return truncated;
  }
}
