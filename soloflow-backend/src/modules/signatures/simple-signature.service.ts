import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib';
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
export class SimpleSignatureService {
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

  /**
   * Assina um PDF com assinatura digital simples (sem certificado A1)
   * Design profissional inspirado em DocuSign, Adobe Sign e ClickSign
   */
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

      // Calcular hash do documento original
      const documentHash = crypto
        .createHash('sha256')
        .update(existingPdfBytes)
        .digest('hex');

      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width: pageWidth } = lastPage.getSize();

      // Embed fonts
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
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

      const signatureToken = this.generateSignatureToken(
        metadata.signer.email,
        documentHash,
        now.toISOString(),
      );

      const validationUrl = `${this.config.validationUrl}/${signatureToken}`;

      // === DIMENSÕES E POSICIONAMENTO ===
      const boxWidth = 280;
      const boxHeight = 155;
      const margin = 40;
      const spacing = 15;

      // Calcular posição X (centralizado ou lado a lado para múltiplas assinaturas)
      const signaturesPerRow = Math.floor((pageWidth - margin * 2 + spacing) / (boxWidth + spacing));
      const col = signatureOrder % signaturesPerRow;
      const row = Math.floor(signatureOrder / signaturesPerRow);

      const x = margin + col * (boxWidth + spacing);
      const y = 30 + row * (boxHeight + spacing);

      // === CORES DO TEMA ===
      const primaryColor = rgb(0.243, 0.318, 0.627);     // #3E51A0 - Azul corporativo
      const secondaryColor = rgb(0.106, 0.635, 0.467);   // #1BA277 - Verde sucesso
      const textDark = rgb(0.133, 0.145, 0.161);         // #222529 - Texto principal
      const textMuted = rgb(0.424, 0.447, 0.475);        // #6C7279 - Texto secundário
      const borderColor = rgb(0.878, 0.886, 0.898);      // #E0E2E5 - Borda
      const bgLight = rgb(0.976, 0.98, 0.984);           // #F9FAFB - Fundo claro

      // === DESENHAR CAIXA PRINCIPAL ===
      // Sombra sutil (simulada com retângulo mais escuro)
      lastPage.drawRectangle({
        x: x + 2,
        y: y - 2,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.5,
      });

      // Fundo principal branco
      lastPage.drawRectangle({
        x: x,
        y: y,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        borderColor: borderColor,
        borderWidth: 1,
      });

      // Barra superior colorida (indica assinatura válida)
      lastPage.drawRectangle({
        x: x,
        y: y + boxHeight - 4,
        width: boxWidth,
        height: 4,
        color: secondaryColor,
      });

      // === TENTAR CARREGAR LOGO ===
      let logoImage: PDFImage | null = null;
      const logoHeight = 22;
      let logoWidth = 22;

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

          if (logoImage) {
            const aspectRatio = logoImage.width / logoImage.height;
            logoWidth = logoHeight * aspectRatio;
          }
        }
      } catch (e) {
        // Logo não disponível, continuar sem ela
        console.warn('Logo não encontrada ou inválida:', e.message);
      }

      // === CABEÇALHO COM LOGO E TÍTULO ===
      let currentY = y + boxHeight - 22;
      const contentX = x + 12;
      const contentWidth = boxWidth - 24;

      // Ícone de verificado (checkmark) ou logo
      if (logoImage) {
        lastPage.drawImage(logoImage, {
          x: contentX,
          y: currentY - 2,
          width: logoWidth,
          height: logoHeight,
        });
      } else {
        // Desenhar círculo verde de verificação se não houver logo
        lastPage.drawCircle({
          x: contentX + 10,
          y: currentY + 8,
          size: 10,
          color: secondaryColor,
        });
        // Desenhar checkmark simplificado
        lastPage.drawLine({
          start: { x: contentX + 5, y: currentY + 7 },
          end: { x: contentX + 9, y: currentY + 3 },
          thickness: 2,
          color: rgb(1, 1, 1),
        });
        lastPage.drawLine({
          start: { x: contentX + 9, y: currentY + 3 },
          end: { x: contentX + 15, y: currentY + 12 },
          thickness: 2,
          color: rgb(1, 1, 1),
        });
      }

      // Título "Assinado digitalmente"
      const headerX = contentX + (logoImage ? logoWidth + 8 : 26);
      lastPage.drawText('Assinado digitalmente', {
        x: headerX,
        y: currentY + 8,
        size: 9,
        font: fontBold,
        color: textDark,
      });

      lastPage.drawText(`via ${this.config.appName}`, {
        x: headerX,
        y: currentY - 3,
        size: 7,
        font: fontRegular,
        color: textMuted,
      });

      currentY -= 28;

      // === LINHA SEPARADORA ===
      lastPage.drawLine({
        start: { x: contentX, y: currentY },
        end: { x: x + boxWidth - 12, y: currentY },
        thickness: 0.5,
        color: borderColor,
      });

      currentY -= 12;

      // === NOME DO ASSINANTE ===
      const signerName = metadata.signer.name.toUpperCase();
      const maxNameWidth = contentWidth - 10;
      let displayName = signerName;

      // Truncar nome se muito longo
      while (fontBold.widthOfTextAtSize(displayName, 10) > maxNameWidth && displayName.length > 10) {
        displayName = displayName.substring(0, displayName.length - 4) + '...';
      }

      lastPage.drawText(displayName, {
        x: contentX,
        y: currentY,
        size: 10,
        font: fontBold,
        color: textDark,
      });

      currentY -= 12;

      // === CPF (parcialmente oculto para privacidade) ===
      if (metadata.signer.cpf) {
        const maskedCpf = this.maskCPF(metadata.signer.cpf);
        lastPage.drawText(`CPF: ${maskedCpf}`, {
          x: contentX,
          y: currentY,
          size: 7.5,
          font: fontRegular,
          color: textMuted,
        });
        currentY -= 10;
      }

      // === E-MAIL ===
      const maxEmailWidth = contentWidth - 10;
      let displayEmail = metadata.signer.email;
      while (fontRegular.widthOfTextAtSize(displayEmail, 7.5) > maxEmailWidth && displayEmail.length > 15) {
        displayEmail = displayEmail.substring(0, displayEmail.length - 4) + '...';
      }

      lastPage.drawText(displayEmail, {
        x: contentX,
        y: currentY,
        size: 7.5,
        font: fontRegular,
        color: textMuted,
      });

      currentY -= 14;

      // === DATA E HORA ===
      lastPage.drawText(`${dateStr} (Horário de Brasília)`, {
        x: contentX,
        y: currentY,
        size: 7,
        font: fontRegular,
        color: textMuted,
      });

      currentY -= 10;

      // === IP (se disponível) ===
      if (metadata.ipAddress) {
        lastPage.drawText(`IP: ${metadata.ipAddress}`, {
          x: contentX,
          y: currentY,
          size: 6.5,
          font: fontRegular,
          color: textMuted,
        });
        currentY -= 10;
      }

      // === SEÇÃO INFERIOR COM TOKEN E QR CODE ===
      // Fundo da seção inferior
      lastPage.drawRectangle({
        x: x + 1,
        y: y + 1,
        width: boxWidth - 2,
        height: 35,
        color: bgLight,
      });

      // Token de validação
      lastPage.drawText('Código de verificação:', {
        x: contentX,
        y: y + 26,
        size: 6,
        font: fontRegular,
        color: textMuted,
      });

      lastPage.drawText(signatureToken, {
        x: contentX,
        y: y + 16,
        size: 8,
        font: fontBold,
        color: primaryColor,
      });

      // URL de validação
      const shortUrl = this.config.appUrl.replace(/^https?:\/\//, '');
      lastPage.drawText(`Verifique em: ${shortUrl}/validar`, {
        x: contentX,
        y: y + 6,
        size: 5.5,
        font: fontRegular,
        color: textMuted,
      });

      // === GERAR QR CODE ===
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
          width: 100,
          margin: 0,
          color: {
            dark: '#3E51A0',
            light: '#FFFFFF',
          },
        });

        // Converter data URL para buffer
        const qrCodeBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrCodeBuffer = Buffer.from(qrCodeBase64, 'base64');
        const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);

        // Desenhar QR Code
        const qrSize = 32;
        lastPage.drawImage(qrCodeImage, {
          x: x + boxWidth - qrSize - 10,
          y: y + 5,
          width: qrSize,
          height: qrSize,
        });
      } catch (qrError) {
        // Se falhar ao gerar QR Code, apenas logar e continuar
        console.warn('Erro ao gerar QR Code:', qrError.message);
      }

      // === METADADOS DO PDF ===
      pdfDoc.setTitle(`Documento Assinado - ${this.config.appName}`);
      pdfDoc.setProducer(`${this.config.appName} - Sistema de Gestão de Processos`);
      pdfDoc.setCreator(metadata.signer.name);
      pdfDoc.setAuthor(metadata.signer.name);
      pdfDoc.setSubject(
        `Documento assinado eletronicamente por ${metadata.signer.name} em ${dateStr}`,
      );
      pdfDoc.setKeywords([
        'assinado',
        'assinatura eletrônica',
        this.config.appName.toLowerCase(),
        signatureToken,
        documentHash.substring(0, 16),
      ]);
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
            ip: metadata.ipAddress,
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
      throw new BadRequestException(
        `Erro ao assinar PDF: ${error.message}`,
      );
    }
  }

  /**
   * Verifica a integridade de um PDF assinado
   */
  async verifyPDFSignature(
    pdfPath: string,
    expectedDocumentHash: string,
  ): Promise<{
    isValid: boolean;
    currentHash: string;
    expectedHash: string;
    message: string;
  }> {
    try {
      if (!existsSync(pdfPath)) {
        throw new BadRequestException('Arquivo PDF não encontrado');
      }

      const pdfBytes = readFileSync(pdfPath);
      const currentHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

      const isValid = currentHash === expectedDocumentHash;

      return {
        isValid,
        currentHash,
        expectedHash: expectedDocumentHash,
        message: isValid
          ? 'Documento íntegro - não foi alterado desde a assinatura'
          : 'ATENÇÃO: O documento foi modificado após a assinatura',
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao verificar assinatura: ${error.message}`,
      );
    }
  }

  /**
   * Gera token único de validação (16 caracteres hexadecimais)
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
   * Valida um token de assinatura
   */
  validateSignatureToken(
    token: string,
    email: string,
    documentHash: string,
    timestamp: string,
  ): boolean {
    const expectedToken = this.generateSignatureToken(
      email,
      documentHash,
      timestamp,
    );
    return token === expectedToken;
  }

  /**
   * Gera hash SHA-256
   */
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Mascara CPF para exibição: ***.456.789-**
   * Protege os dados sensíveis mantendo a identificação parcial
   */
  private maskCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return '***.***.***-**';
    return `***.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-**`;
  }

  /**
   * Adiciona múltiplas assinaturas ao mesmo PDF (para assinaturas sequenciais)
   */
  async addSignatureToPDF(
    pdfPath: string,
    outputPath: string,
    metadata: SignatureMetadata,
    userPassword: string,
    signatureOrder: number,
  ): Promise<SignatureResult> {
    return this.signPDF(
      pdfPath,
      outputPath,
      metadata,
      userPassword,
      signatureOrder,
    );
  }
}
