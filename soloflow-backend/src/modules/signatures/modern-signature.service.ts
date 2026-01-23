import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage, degrees } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as QRCode from 'qrcode';

export interface SignatureMetadata {
  signer: {
    name: string;
    cpf?: string;
    email: string;
    company?: string;
    sector?: string;
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

interface AppConfig {
  appName: string;
  appUrl: string;
  companyName: string;
  logoPath: string;
  validationUrl: string;
}

@Injectable()
export class ModernSignatureService {
  private config: AppConfig;

  constructor() {
    this.config = {
      appName: process.env.APP_NAME || 'Soloflow',
      appUrl: process.env.APP_URL || 'http://localhost:5173',
      companyName: process.env.APP_COMPANY_NAME || 'Soloflow Tecnologia',
      logoPath: process.env.APP_LOGO_PATH || './assets/logo.png',
      validationUrl: process.env.SIGNATURE_VALIDATION_URL || 'http://localhost:5173/validar-assinatura',
    };
  }

  async signPDF(
    pdfPath: string,
    outputPath: string,
    metadata: SignatureMetadata,
    _userPassword: string,
    signatureOrder: number = 0,
  ): Promise<SignatureResult> {
    try {
      if (!existsSync(pdfPath)) {
        throw new BadRequestException('Arquivo PDF não encontrado');
      }

      const existingPdfBytes = readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const documentHash = crypto
        .createHash('sha256')
        .update(existingPdfBytes)
        .digest('hex');

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

      const signatureToken = this.generateSignatureToken(
        metadata.signer.email,
        documentHash,
        now.toISOString(),
      );

      let logoImage: PDFImage | null = null;
      try {
        const absoluteLogoPath = path.resolve(this.config.logoPath);
        if (existsSync(absoluteLogoPath)) {
          const logoBytes = readFileSync(absoluteLogoPath);
          const ext = path.extname(absoluteLogoPath).toLowerCase();
          if (ext === '.png') {
            logoImage = await pdfDoc.embedPng(logoBytes);
          } else if (ext === '.jpg' || ext === '.jpeg') {
            logoImage = await pdfDoc.embedJpg(logoBytes);
          }
        }
      } catch (e) {
        console.warn('Logo não encontrada:', e.message);
      }

      if (signatureOrder === 0) {
        await this.addSideWatermark(pdfDoc, documentHash, fontRegular);
      }

      await this.addCertificatePage(
        pdfDoc,
        metadata,
        dateStr,
        signatureToken,
        documentHash,
        fontRegular,
        fontBold,
        signatureOrder,
        logoImage,
      );

      pdfDoc.setTitle(`Documento Assinado - ${this.config.appName}`);
      pdfDoc.setProducer(`${this.config.appName} - Workflow Management System`);
      pdfDoc.setCreator(metadata.signer.name);
      pdfDoc.setAuthor(metadata.signer.name);
      pdfDoc.setSubject(`Documento assinado eletronicamente por ${metadata.signer.name} em ${dateStr}`);
      pdfDoc.setKeywords(['assinado', 'assinatura eletronica', this.config.appName.toLowerCase(), signatureToken]);
      pdfDoc.setCreationDate(now);
      pdfDoc.setModificationDate(now);

      const pdfBytes = await pdfDoc.save();
      writeFileSync(outputPath, pdfBytes);

      const signatureHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          signer: metadata.signer,
          documentHash,
          timestamp: now.toISOString(),
          token: signatureToken,
          ip: metadata.ipAddress,
        }))
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

  private async addSideWatermark(
    pdfDoc: PDFDocument,
    documentHash: string,
    font: PDFFont,
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    const hashShort = documentHash.substring(0, 12).toUpperCase();
    const watermarkText = `Documento assinado digitalmente | ${this.config.appName} | ${hashShort}`;
    const textSize = 7;
    const textColor = rgb(0.65, 0.65, 0.65);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, textSize);

      page.drawText(watermarkText, {
        x: width - 10,
        y: (height / 2) + (textWidth / 2),
        size: textSize,
        font: font,
        color: textColor,
        rotate: degrees(270),
      });
    }
  }

  private async addCertificatePage(
    pdfDoc: PDFDocument,
    metadata: SignatureMetadata,
    dateStr: string,
    signatureToken: string,
    documentHash: string,
    fontRegular: PDFFont,
    fontBold: PDFFont,
    signatureOrder: number,
    logoImage: PDFImage | null,
  ): Promise<void> {
    // Cores - Paleta clean e moderna
    const primaryBlue = rgb(0.18, 0.34, 0.60);       // #2E5799
    const successGreen = rgb(0.15, 0.55, 0.40);     // #268C66
    const textPrimary = rgb(0.15, 0.15, 0.18);      // #262630
    const textSecondary = rgb(0.45, 0.47, 0.50);    // #737880
    const borderLight = rgb(0.85, 0.87, 0.90);      // #D9DEE6
    const bgSubtle = rgb(0.97, 0.97, 0.98);         // #F8F8FA
    const white = rgb(1, 1, 1);

    // Dimensoes A4
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 48;
    const contentWidth = pageWidth - (margin * 2);

    // Layout
    const signatureCardHeight = 100;
    const cardSpacing = 16;
    const headerAreaHeight = 120;
    const footerAreaHeight = 160;

    const availableForSignatures = pageHeight - headerAreaHeight - footerAreaHeight - (margin * 2);
    const maxSignaturesPerPage = Math.floor(availableForSignatures / (signatureCardHeight + cardSpacing));
    const positionInPage = signatureOrder % maxSignaturesPerPage;

    let page: PDFPage;
    if (positionInPage === 0) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
    } else {
      page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    }

    const { width, height } = page.getSize();

    // =====================================
    // HEADER
    // =====================================
    if (positionInPage === 0) {
      // Barra superior azul
      page.drawRectangle({
        x: 0,
        y: height - 6,
        width: width,
        height: 6,
        color: primaryBlue,
      });

      // Area do header
      const headerTop = height - 35;

      // Logo (lado esquerdo)
      let logoEndX = margin;
      if (logoImage) {
        const logoHeight = 36;
        const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
        page.drawImage(logoImage, {
          x: margin,
          y: headerTop - logoHeight + 8,
          width: logoWidth,
          height: logoHeight,
        });
        logoEndX = margin + logoWidth + 15;
      } else {
        page.drawText(this.config.appName, {
          x: margin,
          y: headerTop - 8,
          size: 20,
          font: fontBold,
          color: primaryBlue,
        });
        logoEndX = margin + fontBold.widthOfTextAtSize(this.config.appName, 20) + 15;
      }

      // Separador vertical
      page.drawLine({
        start: { x: logoEndX, y: headerTop + 5 },
        end: { x: logoEndX, y: headerTop - 30 },
        thickness: 1,
        color: borderLight,
      });

      // Titulo ao lado do logo
      page.drawText('Certificado de Assinaturas', {
        x: logoEndX + 15,
        y: headerTop - 5,
        size: 14,
        font: fontBold,
        color: textPrimary,
      });

      page.drawText('Registro de assinaturas com validade legal', {
        x: logoEndX + 15,
        y: headerTop - 22,
        size: 9,
        font: fontRegular,
        color: textSecondary,
      });

      // Linha divisoria do header
      page.drawLine({
        start: { x: margin, y: headerTop - 45 },
        end: { x: width - margin, y: headerTop - 45 },
        thickness: 1,
        color: borderLight,
      });

      // Info do documento abaixo da linha
      const infoY = headerTop - 65;

      page.drawText('Documento:', {
        x: margin,
        y: infoY,
        size: 8,
        font: fontRegular,
        color: textSecondary,
      });
      page.drawText(documentHash.substring(0, 32).toUpperCase() + '...', {
        x: margin + 55,
        y: infoY,
        size: 8,
        font: fontBold,
        color: textPrimary,
      });

      page.drawText('Status:', {
        x: width - margin - 120,
        y: infoY,
        size: 8,
        font: fontRegular,
        color: textSecondary,
      });

      // Badge de status
      const statusBadgeX = width - margin - 80;
      page.drawRectangle({
        x: statusBadgeX,
        y: infoY - 4,
        width: 80,
        height: 16,
        color: rgb(0.92, 0.98, 0.95),
        borderColor: successGreen,
        borderWidth: 0.5,
      });
      page.drawText('CONCLUIDO', {
        x: statusBadgeX + 12,
        y: infoY,
        size: 8,
        font: fontBold,
        color: successGreen,
      });
    }

    // =====================================
    // CARD DE ASSINATURA
    // =====================================
    const cardsStartY = height - headerAreaHeight - 20;
    const cardY = cardsStartY - (positionInPage * (signatureCardHeight + cardSpacing)) - signatureCardHeight;

    // Fundo do card
    page.drawRectangle({
      x: margin,
      y: cardY,
      width: contentWidth,
      height: signatureCardHeight,
      color: white,
      borderColor: borderLight,
      borderWidth: 1,
    });

    // Indicador verde na esquerda
    page.drawRectangle({
      x: margin,
      y: cardY,
      width: 4,
      height: signatureCardHeight,
      color: successGreen,
    });

    // Conteudo do card - Layout em duas colunas
    const cardPadding = 16;
    const leftColX = margin + cardPadding + 8;
    const rightColX = margin + contentWidth - 160;

    // Coluna esquerda - Info do assinante
    let leftY = cardY + signatureCardHeight - cardPadding - 2;

    // Nome do assinante
    page.drawText(metadata.signer.name, {
      x: leftColX,
      y: leftY,
      size: 12,
      font: fontBold,
      color: textPrimary,
    });
    leftY -= 14;

    // Empresa e Setor (se disponiveis)
    if (metadata.signer.company || metadata.signer.sector) {
      let orgText = '';
      if (metadata.signer.company && metadata.signer.sector) {
        orgText = `${metadata.signer.company} - ${metadata.signer.sector}`;
      } else if (metadata.signer.company) {
        orgText = metadata.signer.company;
      } else if (metadata.signer.sector) {
        orgText = metadata.signer.sector;
      }
      page.drawText(orgText, {
        x: leftColX,
        y: leftY,
        size: 9,
        font: fontRegular,
        color: primaryBlue,
      });
      leftY -= 12;
    }

    // Email
    page.drawText(metadata.signer.email, {
      x: leftColX,
      y: leftY,
      size: 9,
      font: fontRegular,
      color: textSecondary,
    });
    leftY -= 12;

    // CPF (se disponivel)
    if (metadata.signer.cpf) {
      page.drawText(`CPF: ${this.maskCPF(metadata.signer.cpf)}`, {
        x: leftColX,
        y: leftY,
        size: 9,
        font: fontRegular,
        color: textSecondary,
      });
      leftY -= 12;
    }

    // Data/hora e IP na mesma linha
    let dateIpText = dateStr;
    if (metadata.ipAddress) {
      dateIpText += `  |  IP: ${metadata.ipAddress}`;
    }
    page.drawText(dateIpText, {
      x: leftColX,
      y: leftY,
      size: 8,
      font: fontRegular,
      color: textSecondary,
    });

    // Coluna direita - Codigo de verificacao
    const rightY = cardY + signatureCardHeight - cardPadding - 2;

    page.drawText('Token de Autenticidade', {
      x: rightColX,
      y: rightY,
      size: 8,
      font: fontRegular,
      color: textSecondary,
    });

    // Box do token
    const tokenBoxY = rightY - 32;
    page.drawRectangle({
      x: rightColX - 4,
      y: tokenBoxY,
      width: 148,
      height: 26,
      color: bgSubtle,
      borderColor: primaryBlue,
      borderWidth: 1,
    });

    page.drawText(signatureToken, {
      x: rightColX + 8,
      y: tokenBoxY + 8,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });

    // =====================================
    // FOOTER - Validacao e info legal
    // =====================================
    if (positionInPage === 0) {
      const footerTop = footerAreaHeight + margin;

      // Linha divisoria
      page.drawLine({
        start: { x: margin, y: footerTop },
        end: { x: width - margin, y: footerTop },
        thickness: 1,
        color: borderLight,
      });

      // Box de validacao
      const validationBoxY = footerTop - 100;
      page.drawRectangle({
        x: margin,
        y: validationBoxY,
        width: contentWidth,
        height: 90,
        color: bgSubtle,
        borderColor: borderLight,
        borderWidth: 1,
      });

      // QR Code
      const qrSize = 70;
      const qrX = margin + 12;
      const qrY = validationBoxY + 10;

      const validationUrl = `${this.config.validationUrl}/${signatureToken}`;
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
          width: 256,
          margin: 1,
          color: { dark: '#2E5799', light: '#F8F8FA' },
        });
        const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);
        page.drawImage(qrCodeImage, {
          x: qrX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });
      } catch (e) {
        console.warn('Erro ao gerar QR Code:', e.message);
      }

      // Instrucoes ao lado do QR
      const instrX = qrX + qrSize + 20;
      let instrY = validationBoxY + 75;

      page.drawText('Validar Assinaturas', {
        x: instrX,
        y: instrY,
        size: 11,
        font: fontBold,
        color: textPrimary,
      });
      instrY -= 18;

      page.drawText('Escaneie o QR Code ou acesse:', {
        x: instrX,
        y: instrY,
        size: 9,
        font: fontRegular,
        color: textSecondary,
      });
      instrY -= 14;

      const shortUrl = this.config.validationUrl.replace(/^https?:\/\//, '');
      page.drawText(shortUrl, {
        x: instrX,
        y: instrY,
        size: 9,
        font: fontBold,
        color: primaryBlue,
      });
      instrY -= 18;

      page.drawText('Insira o token para validar cada assinatura.', {
        x: instrX,
        y: instrY,
        size: 8,
        font: fontRegular,
        color: textSecondary,
      });

      // Rodape final
      const footerY = margin + 5;

      // Hash
      page.drawText(`SHA-256: ${documentHash}`, {
        x: margin,
        y: footerY + 20,
        size: 6,
        font: fontRegular,
        color: textSecondary,
      });

      // Aviso legal
      page.drawText(
        'Assinado digitalmente conforme MP 2.200-2/2001 e Lei 14.063/2020.',
        {
          x: margin,
          y: footerY + 8,
          size: 7,
          font: fontRegular,
          color: textSecondary,
        }
      );

      // Credito
      page.drawText(
        `${this.config.appName} - ${this.config.companyName}`,
        {
          x: margin,
          y: footerY - 4,
          size: 7,
          font: fontRegular,
          color: textSecondary,
        }
      );
    }
  }

  generateSignatureToken(email: string, documentHash: string, timestamp: string): string {
    const data = `${email}:${documentHash}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash.substring(0, 16).toUpperCase();
  }

  private maskCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return '***.***.***-**';
    return `***.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-**`;
  }

  private formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

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
