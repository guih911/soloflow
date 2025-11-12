import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

export interface SignatureMetadata {
  signer: {
    name: string;
    cpf?: string;
    email: string;
  };
  reason?: string;
  location?: string;
  contactInfo?: string;
  ipAddress?: string;
}

export interface SignatureResult {
  signedPath: string;
  signatureHash: string;
  documentHash: string;
  signatureToken: string;
}

@Injectable()
export class ModernSignatureService {
  private readonly validationBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  /**
   * Assina um PDF com design moderno, QR Code e página de validação
   */
  async signPDF(
    pdfPath: string,
    outputPath: string,
    metadata: SignatureMetadata,
    userPassword: string,
    signatureOrder: number = 0,
  ): Promise<SignatureResult> {
    try {
      if (!existsSync(pdfPath)) {
        throw new BadRequestException('Arquivo PDF não encontrado');
      }

      // Carregar PDF
      const existingPdfBytes = readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Calcular hash do documento original
      const documentHash = crypto
        .createHash('sha256')
        .update(existingPdfBytes)
        .digest('hex');

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Preparar dados da assinatura
      const now = new Date();
      const dateStr = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      // Gerar token único de validação
      const signatureToken = this.generateSignatureToken(
        metadata.signer.email,
        documentHash,
        now.toISOString(),
      );

      // 1. Adicionar assinatura na lateral das páginas
      await this.addSignatureToPageSides(
        pdfDoc,
        metadata,
        dateStr,
        signatureToken,
        documentHash,
        signatureOrder,
        font,
        fontBold,
      );

      // 2. Adicionar certificado de assinatura (múltiplas assinaturas na mesma página)
      await this.addValidationPage(
        pdfDoc,
        metadata,
        dateStr,
        signatureToken,
        documentHash,
        font,
        fontBold,
        signatureOrder,
      );

      // Adicionar metadados
      pdfDoc.setTitle('Documento Assinado Digitalmente - Soloflow');
      pdfDoc.setProducer('Soloflow - Sistema de Gestão de Processos');
      pdfDoc.setCreator(metadata.signer.name);
      pdfDoc.setAuthor(metadata.signer.name);
      pdfDoc.setSubject(`Documento assinado por ${metadata.signer.name} em ${dateStr}`);
      pdfDoc.setKeywords(['assinado', 'soloflow', signatureToken, documentHash]);
      pdfDoc.setCreationDate(now);
      pdfDoc.setModificationDate(now);

      // Salvar PDF
      const pdfBytes = await pdfDoc.save();
      writeFileSync(outputPath, pdfBytes);

      // Calcular hash da assinatura
      const signatureHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            signer: metadata.signer,
            documentHash,
            timestamp: now.toISOString(),
            token: signatureToken,
          }),
        )
        .digest('hex');

      return {
        signedPath: outputPath,
        signatureHash,
        documentHash,
        signatureToken,
      };
    } catch (error) {
      throw new BadRequestException(`Erro ao assinar PDF: ${error.message}`);
    }
  }

  /**
   * Adiciona assinatura nas laterais de todas as páginas (texto vertical na margem direita)
   */
  private async addSignatureToPageSides(
    pdfDoc: PDFDocument,
    metadata: SignatureMetadata,
    dateStr: string,
    signatureToken: string,
    documentHash: string,
    signatureOrder: number,
    font: PDFFont,
    fontBold: PDFFont,
  ): Promise<void> {
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // Texto vertical na margem direita
      const margin = 10;
      const textSize = 7;

      // Criar texto que será rotacionado
      const signatureText = `Este documento foi assinado digitalmente. Valide em: ${this.validationBaseUrl}/validar-assinatura - Codigo de Validacao: ${signatureToken}`;

      // Desenhar texto rotacionado em 90 graus (vertical)
      const textWidth = font.widthOfTextAtSize(signatureText, textSize);
      const x = width - margin - 5;
      const y = height / 2 + textWidth / 2;

      page.drawText(signatureText, {
        x: x,
        y: y,
        size: textSize,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
        rotate: degrees(270), // Rotação vertical
      });
    }
  }

  /**
   * Adiciona certificado de assinatura com design profissional
   * Suporta múltiplas assinaturas na mesma página
   */
  private async addValidationPage(
    pdfDoc: PDFDocument,
    metadata: SignatureMetadata,
    dateStr: string,
    signatureToken: string,
    documentHash: string,
    font: PDFFont,
    fontBold: PDFFont,
    signatureOrder: number = 0,
  ): Promise<void> {
    const margin = 50;
    const signatureBoxHeight = 110; // Altura de cada box de assinante
    const headerHeight = 150; // Altura do cabeçalho
    const qrSectionHeight = 140; // Altura da seção QR Code
    const footerHeight = 50; // Altura do rodapé
    const spacing = 15; // Espaçamento entre boxes

    // Calcular quantas assinaturas cabem em uma página
    const pageStandardHeight = 842; // A4 height
    const availableHeight = pageStandardHeight - headerHeight - qrSectionHeight - footerHeight - (margin * 2);
    const maxSignaturesPerPage = Math.floor(availableHeight / (signatureBoxHeight + spacing));

    // Determinar qual página usar
    const pageIndex = Math.floor(signatureOrder / maxSignaturesPerPage);
    const positionInPage = signatureOrder % maxSignaturesPerPage;

    // Obter ou criar página de certificado
    let page: PDFPage;
    const certificatePageIndex = pdfDoc.getPageCount() - pageIndex - 1;

    if (positionInPage === 0) {
      // Primeira assinatura desta página - criar nova página
      page = pdfDoc.addPage();
    } else {
      // Assinatura adicional - usar página existente
      page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    }

    const { width, height } = page.getSize();

    // ============================================
    // CABEÇALHO (apenas na primeira assinatura da página)
    // ============================================
    if (positionInPage === 0) {
      let currentY = height - 60;

      // Título principal
      page.drawText('CERTIFICADO DE ASSINATURA DIGITAL', {
        x: margin,
        y: currentY,
        size: 16,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      currentY -= 8;

      // Linha decorativa abaixo do título
      page.drawRectangle({
        x: margin,
        y: currentY,
        width: 200,
        height: 3,
        color: rgb(0.2, 0.4, 0.8),
      });

      currentY -= 30;

      // Informações do documento
      page.drawText('Sistema de Gestao de Processos - Soloflow', {
        x: margin,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // ============================================
    // CAIXA DE ASSINATURA (posicionada baseada na ordem)
    // ============================================
    const boxWidth = width - (margin * 2);

    // Calcular posição Y baseado na posição da assinatura na página
    const startY = height - headerHeight;
    const boxY = startY - (positionInPage * (signatureBoxHeight + spacing)) - signatureBoxHeight;

    // Fundo da caixa com borda e sombra
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: boxWidth,
      height: signatureBoxHeight,
      borderColor: rgb(0.25, 0.25, 0.25),
      borderWidth: 1.2,
      color: rgb(0.97, 0.97, 0.97),
    });

    // Barra lateral colorida (indicador visual)
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: 6,
      height: signatureBoxHeight,
      color: rgb(0.2, 0.65, 0.35), // Verde para assinatura válida
    });

    // Conteúdo da caixa
    let boxTextY = boxY + signatureBoxHeight - 20;
    const boxTextX = margin + 20;

    // Nome do assinante em destaque (sem label)
    page.drawText(metadata.signer.name.toUpperCase(), {
      x: boxTextX,
      y: boxTextY,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    boxTextY -= 16;

    // Informações em linha única (CPF | Email | Data/Hora)
    const infoText: string[] = [];

    if (metadata.signer.cpf) {
      infoText.push(`CPF: ${this.formatCPF(metadata.signer.cpf)}`);
    }

    infoText.push(`Email: ${metadata.signer.email}`);
    infoText.push(`Data/Hora: ${dateStr.substring(0, 16)}`); // Formato mais curto

    page.drawText(infoText.join('  |  '), {
      x: boxTextX,
      y: boxTextY,
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    boxTextY -= 14;

    // Linha separadora fina
    page.drawLine({
      start: { x: boxTextX, y: boxTextY },
      end: { x: margin + boxWidth - 20, y: boxTextY },
      thickness: 0.4,
      color: rgb(0.75, 0.75, 0.75),
    });

    boxTextY -= 12;

    // Token de validação em destaque
    page.drawText('Codigo de Validacao:', {
      x: boxTextX,
      y: boxTextY,
      size: 7,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    boxTextY -= 14;

    // Token em caixa destacada
    const tokenBoxX = boxTextX;
    const tokenBoxY = boxTextY - 5;

    page.drawRectangle({
      x: tokenBoxX - 3,
      y: tokenBoxY,
      width: 140,
      height: 16,
      color: rgb(1, 0.95, 0.85), // Fundo amarelo claro
      borderColor: rgb(0.9, 0.7, 0.3),
      borderWidth: 0.8,
    });

    page.drawText(signatureToken, {
      x: tokenBoxX,
      y: tokenBoxY + 3,
      size: 10,
      font: fontBold,
      color: rgb(0.7, 0.3, 0.1), // Marrom/laranja escuro
    });

    boxTextY -= 18;

    // Texto legal compacto
    page.drawText('Assinado eletronicamente. Valide em: ' + this.validationBaseUrl + '/validar-assinatura', {
      x: boxTextX,
      y: boxTextY,
      size: 6,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // ============================================
    // SEÇÃO DE VALIDAÇÃO COM QR CODE (apenas na primeira assinatura)
    // ============================================
    if (positionInPage === 0) {
      const qrSectionY = qrSectionHeight + footerHeight + (margin / 2);

      // Título da seção
      page.drawText('VALIDACAO DO DOCUMENTO', {
        x: margin,
        y: qrSectionY + qrSectionHeight - 10,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Caixa do QR Code (esquerda)
      const qrBoxSize = 100;
      page.drawRectangle({
        x: margin,
        y: qrSectionY,
        width: qrBoxSize,
        height: qrBoxSize,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 1,
        color: rgb(1, 1, 1),
      });

      // Gerar e adicionar QR Code
      const qrCodeUrl = `${this.validationBaseUrl}/validar-assinatura?token=${documentHash.substring(0, 16).toUpperCase()}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);

      page.drawImage(qrCodeImage, {
        x: margin + 5,
        y: qrSectionY + 5,
        width: qrBoxSize - 10,
        height: qrBoxSize - 10,
      });

      // Informações de validação (direita do QR Code)
      const validationTextX = margin + qrBoxSize + 20;
      let validationY = qrSectionY + qrBoxSize - 15;

      page.drawText('Escaneie o QR Code para validar as assinaturas', {
        x: validationTextX,
        y: validationY,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      validationY -= 14;

      page.drawText('ou acesse:', {
        x: validationTextX,
        y: validationY,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });

      validationY -= 12;

      page.drawText(`${this.validationBaseUrl}/validar-assinatura`, {
        x: validationTextX,
        y: validationY,
        size: 8,
        font: font,
        color: rgb(0.2, 0.4, 0.8),
      });

      validationY -= 16;

      const instructions = this.wrapText(
        'Digite o Codigo de Validacao que aparece em cada assinatura para verificar a autenticidade.',
        boxWidth - qrBoxSize - 40,
        font,
        7
      );

      instructions.forEach((line, index) => {
        page.drawText(line, {
          x: validationTextX,
          y: validationY - (index * 9),
          size: 7,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      });

      // ============================================
      // RODAPÉ DA PÁGINA
      // ============================================
      const footerYPos = 30;

      // Linha horizontal
      page.drawLine({
        start: { x: margin, y: footerYPos + 15 },
        end: { x: width - margin, y: footerYPos + 15 },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6),
      });

      // Texto do rodapé
      const footerText = `Hash do documento: ${documentHash.substring(0, 40)}...`;
      page.drawText(footerText, {
        x: margin,
        y: footerYPos,
        size: 6,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pageNumber = `Pagina ${pdfDoc.getPageCount()} de ${pdfDoc.getPageCount()}`;
      const pageNumWidth = font.widthOfTextAtSize(pageNumber, 6);
      page.drawText(pageNumber, {
        x: width - margin - pageNumWidth,
        y: footerYPos,
        size: 6,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  /**
   * Gera token único de validação
   */
  generateSignatureToken(
    email: string,
    documentHash: string,
    timestamp: string,
  ): string {
    const data = `${email}:${documentHash}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash.substring(0, 16).toUpperCase();
  }

  /**
   * Formata CPF: 000.000.000-00
   */
  private formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Trunca texto para caber no espaço disponível
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Quebra texto em múltiplas linhas para caber na largura especificada
   */
  private wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Adiciona múltiplas assinaturas ao mesmo PDF
   */
  async addSignatureToPDF(
    pdfPath: string,
    outputPath: string,
    metadata: SignatureMetadata,
    userPassword: string,
    signatureOrder: number,
  ): Promise<SignatureResult> {
    return this.signPDF(pdfPath, outputPath, metadata, userPassword, signatureOrder);
  }
}
