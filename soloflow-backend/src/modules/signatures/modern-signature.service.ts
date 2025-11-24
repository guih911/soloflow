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
      pdfDoc.setProducer('Soloflow - Sistema de Gestao de Processos');
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
   * Adiciona marca d'água lateral profissional em todas as páginas
   * Design inspirado em ZapSign/DocuSign - texto vertical discreto na margem
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
    // Só adicionar texto lateral na primeira assinatura para evitar duplicação
    if (signatureOrder > 0) {
      return;
    }

    const pages = pdfDoc.getPages();
    // Não adicionar na última página (página de certificado)
    const pagesToMark = pages.length > 1 ? pages.slice(0, -1) : pages;

    for (let i = 0; i < pagesToMark.length; i++) {
      const page = pagesToMark[i];
      const { width, height } = page.getSize();

      const textSize = 7;
      const hashShort = documentHash.substring(0, 16).toUpperCase();

      // Texto principal da assinatura lateral
      const signatureText = `Documento assinado digitalmente. Valide em: ${this.validationBaseUrl}/validar-assinatura | Hash: ${hashShort}`;

      // Calcular posição do texto rotacionado
      const textWidth = font.widthOfTextAtSize(signatureText, textSize);
      const x = width - 8;
      const y = (height / 2) + (textWidth / 2);

      // Desenhar texto rotacionado verticalmente (90 graus)
      page.drawText(signatureText, {
        x: x,
        y: y,
        size: textSize,
        font: font,
        color: rgb(0.45, 0.45, 0.45),
        rotate: degrees(270),
      });
    }
  }

  /**
   * Adiciona página de certificado profissional estilo ZapSign/DocuSign
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
    const margin = 40;
    const signatureBoxHeight = 85;
    const headerHeight = 130;
    const qrSectionHeight = 120;
    const footerHeight = 60;
    const spacing = 12;

    // Cores do tema
    const primaryColor = rgb(0.18, 0.34, 0.56); // Azul escuro profissional
    const accentColor = rgb(0.13, 0.55, 0.13); // Verde sucesso
    const textDark = rgb(0.15, 0.15, 0.15);
    const textMuted = rgb(0.45, 0.45, 0.45);
    const borderLight = rgb(0.88, 0.88, 0.88);

    const pageStandardHeight = 842;
    const availableHeight = pageStandardHeight - headerHeight - qrSectionHeight - footerHeight - (margin * 2);
    const maxSignaturesPerPage = Math.floor(availableHeight / (signatureBoxHeight + spacing));
    const positionInPage = signatureOrder % maxSignaturesPerPage;

    let page: PDFPage;
    if (positionInPage === 0) {
      page = pdfDoc.addPage();
    } else {
      page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    }

    const { width, height } = page.getSize();

    // ============================================
    // CABEÇALHO PROFISSIONAL
    // ============================================
    if (positionInPage === 0) {
      // Barra superior colorida
      page.drawRectangle({
        x: 0,
        y: height - 6,
        width: width,
        height: 6,
        color: primaryColor,
      });

      let currentY = height - 50;

      // Logo/Título do sistema
      page.drawText('SOLOFLOW', {
        x: margin,
        y: currentY,
        size: 22,
        font: fontBold,
        color: primaryColor,
      });

      // Subtítulo
      page.drawText('Sistema de Gestao de Processos', {
        x: margin,
        y: currentY - 16,
        size: 9,
        font: font,
        color: textMuted,
      });

      // Badge de documento assinado (lado direito)
      const badgeWidth = 150;
      const badgeX = width - margin - badgeWidth;
      page.drawRectangle({
        x: badgeX,
        y: currentY - 20,
        width: badgeWidth,
        height: 35,
        color: rgb(0.94, 0.97, 0.94),
        borderColor: accentColor,
        borderWidth: 1,
      });

      page.drawText('DOCUMENTO ASSINADO', {
        x: badgeX + 20,
        y: currentY - 5,
        size: 10,
        font: fontBold,
        color: accentColor,
      });

      page.drawText('DIGITALMENTE', {
        x: badgeX + 35,
        y: currentY - 17,
        size: 10,
        font: fontBold,
        color: accentColor,
      });

      currentY -= 55;

      // Linha divisória
      page.drawLine({
        start: { x: margin, y: currentY },
        end: { x: width - margin, y: currentY },
        thickness: 1,
        color: borderLight,
      });

      currentY -= 20;

      // Título da seção
      page.drawText('REGISTRO DE ASSINATURAS', {
        x: margin,
        y: currentY,
        size: 12,
        font: fontBold,
        color: textDark,
      });
    }

    // ============================================
    // CAIXA DE ASSINATURA INDIVIDUAL
    // ============================================
    const boxWidth = width - (margin * 2);
    const startY = height - headerHeight;
    const boxY = startY - (positionInPage * (signatureBoxHeight + spacing)) - signatureBoxHeight;

    // Container da assinatura com borda
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: boxWidth,
      height: signatureBoxHeight,
      borderColor: borderLight,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    // Indicador lateral verde (assinatura válida)
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: 4,
      height: signatureBoxHeight,
      color: accentColor,
    });

    // Ícone de check (simulado com texto)
    page.drawRectangle({
      x: margin + 15,
      y: boxY + signatureBoxHeight - 28,
      width: 20,
      height: 20,
      color: accentColor,
    });
    page.drawText('OK', {
      x: margin + 17,
      y: boxY + signatureBoxHeight - 22,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    let boxTextY = boxY + signatureBoxHeight - 18;
    const boxTextX = margin + 45;

    // Nome do assinante
    page.drawText(metadata.signer.name, {
      x: boxTextX,
      y: boxTextY,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    boxTextY -= 15;

    // CPF formatado
    if (metadata.signer.cpf) {
      page.drawText(`CPF: ${this.formatCPF(metadata.signer.cpf)}`, {
        x: boxTextX,
        y: boxTextY,
        size: 9,
        font: font,
        color: textMuted,
      });
      boxTextY -= 12;
    }

    // Email
    page.drawText(`E-mail: ${metadata.signer.email}`, {
      x: boxTextX,
      y: boxTextY,
      size: 9,
      font: font,
      color: textMuted,
    });

    boxTextY -= 12;

    // Data/Hora da assinatura
    page.drawText(`Assinado em: ${dateStr}`, {
      x: boxTextX,
      y: boxTextY,
      size: 9,
      font: font,
      color: textMuted,
    });

    // Código de validação (lado direito)
    const tokenX = width - margin - 140;
    page.drawText('Codigo de Validacao', {
      x: tokenX,
      y: boxY + signatureBoxHeight - 18,
      size: 7,
      font: font,
      color: textMuted,
    });

    // Box do token
    page.drawRectangle({
      x: tokenX - 5,
      y: boxY + signatureBoxHeight - 50,
      width: 135,
      height: 24,
      color: rgb(0.96, 0.96, 0.98),
      borderColor: primaryColor,
      borderWidth: 1,
    });

    page.drawText(signatureToken, {
      x: tokenX + 10,
      y: boxY + signatureBoxHeight - 42,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    // ============================================
    // SEÇÃO DE VALIDAÇÃO (apenas primeira assinatura)
    // ============================================
    if (positionInPage === 0) {
      const qrSectionY = footerHeight + 20;

      // Linha divisória
      page.drawLine({
        start: { x: margin, y: qrSectionY + qrSectionHeight + 10 },
        end: { x: width - margin, y: qrSectionY + qrSectionHeight + 10 },
        thickness: 1,
        color: borderLight,
      });

      // Título
      page.drawText('COMO VALIDAR ESTE DOCUMENTO', {
        x: margin,
        y: qrSectionY + qrSectionHeight - 5,
        size: 10,
        font: fontBold,
        color: textDark,
      });

      // QR Code
      const qrBoxSize = 80;
      const qrCodeUrl = `${this.validationBaseUrl}/validar-assinatura?token=${signatureToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);
      page.drawImage(qrCodeImage, {
        x: margin,
        y: qrSectionY,
        width: qrBoxSize,
        height: qrBoxSize,
      });

      // Instruções
      const instrX = margin + qrBoxSize + 20;
      let instrY = qrSectionY + qrBoxSize - 10;

      page.drawText('1. Escaneie o QR Code com seu celular', {
        x: instrX, y: instrY, size: 9, font: font, color: textMuted,
      });
      instrY -= 14;

      page.drawText('   ou acesse:', {
        x: instrX, y: instrY, size: 9, font: font, color: textMuted,
      });
      instrY -= 14;

      page.drawText(`   ${this.validationBaseUrl}/validar-assinatura`, {
        x: instrX, y: instrY, size: 9, font: fontBold, color: primaryColor,
      });
      instrY -= 18;

      page.drawText('2. Digite o Codigo de Validacao de cada assinatura', {
        x: instrX, y: instrY, size: 9, font: font, color: textMuted,
      });
      instrY -= 14;

      page.drawText('3. Confira os dados do assinante', {
        x: instrX, y: instrY, size: 9, font: font, color: textMuted,
      });

      // ============================================
      // RODAPÉ
      // ============================================
      page.drawLine({
        start: { x: margin, y: footerHeight - 5 },
        end: { x: width - margin, y: footerHeight - 5 },
        thickness: 0.5,
        color: borderLight,
      });

      // Hash do documento
      page.drawText(`Hash SHA-256: ${documentHash.substring(0, 32)}...`, {
        x: margin,
        y: footerHeight - 20,
        size: 7,
        font: font,
        color: textMuted,
      });

      // Data de emissão e página
      const footerRight = `Emitido em: ${new Date().toLocaleDateString('pt-BR')} | Pagina ${pdfDoc.getPageCount()}`;
      const footerRightWidth = font.widthOfTextAtSize(footerRight, 7);
      page.drawText(footerRight, {
        x: width - margin - footerRightWidth,
        y: footerHeight - 20,
        size: 7,
        font: font,
        color: textMuted,
      });

      // Aviso legal
      page.drawText('Este documento foi assinado eletronicamente conforme MP 2.200-2/2001 e possui validade juridica.', {
        x: margin,
        y: footerHeight - 35,
        size: 6,
        font: font,
        color: textMuted,
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
