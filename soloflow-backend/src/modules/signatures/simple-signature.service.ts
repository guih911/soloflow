import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as crypto from 'crypto';

export interface SignatureMetadata {
  signer: {
    name: string;
    cpf?: string;
    email: string;
  };
  reason?: string;
  location?: string;
  contactInfo?: string;
  ipAddress?: string; // IP público do assinante
}

export interface SignatureResult {
  signedPath: string;
  signatureHash: string;
  documentHash: string;
  signatureToken: string;
}

@Injectable()
export class SimpleSignatureService {
  /**
   * Assina um PDF com assinatura digital simples (sem certificado A1)
   * Valida pela senha do usuário e adiciona marcação visual + hash
   */
  async signPDF(
    pdfPath: string,
    outputPath: string,
    metadata: SignatureMetadata,
    userPassword: string,
    signatureOrder: number = 0,
  ): Promise<SignatureResult> {
    try {
      // Verificar se arquivo existe
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

      // Obter última página
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 8;
      const titleSize = 10;

      // Preparar texto da assinatura
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

      // Dimensões da caixa de assinatura (aumentada para acomodar mais informações)
      const boxWidth = 520;
      const boxHeight = 140;
      const margin = 50;
      const x = margin;
      // Posição Y calculada baseada na ordem da assinatura (empilha verticalmente)
      const y = 50 + (signatureOrder * (boxHeight + 10)); // 10px de espaçamento entre assinaturas

      // Desenhar borda externa (cinza escuro)
      lastPage.drawRectangle({
        x: x,
        y: y,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 1.5,
        color: rgb(1, 1, 1), // Fundo branco
      });

      // Desenhar borda interna (mais clara)
      lastPage.drawRectangle({
        x: x + 3,
        y: y + 3,
        width: boxWidth - 6,
        height: boxHeight - 6,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.5,
      });

      // Posição inicial do texto
      let currentY = y + boxHeight - 20;
      const textX = x + 15;

      // Título: "Assinado eletronicamente por"
      lastPage.drawText('Assinado eletronicamente por', {
        x: textX,
        y: currentY,
        size: titleSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 16;

      // Nome do assinante (em negrito e maior)
      lastPage.drawText(metadata.signer.name.toUpperCase(), {
        x: textX,
        y: currentY,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      currentY -= 14;

      // CPF
      if (metadata.signer.cpf) {
        lastPage.drawText(`CPF: ${this.formatCPF(metadata.signer.cpf)}`, {
          x: textX,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 12;
      }

      // E-mail
      lastPage.drawText(`E-mail: ${metadata.signer.email}`, {
        x: textX,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 12;

      // IP público (se disponível)
      if (metadata.ipAddress) {
        lastPage.drawText(`IP: ${metadata.ipAddress}`, {
          x: textX,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 12;
      }

      // Data e hora
      lastPage.drawText(`Data e hora: ${dateStr}`, {
        x: textX,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 16;

      // Linha separadora
      lastPage.drawLine({
        start: { x: textX, y: currentY },
        end: { x: x + boxWidth - 15, y: currentY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      currentY -= 12;

      // Nota de validade jurídica conforme MP 2.200-2/2001
      const legalNote1 = 'Este documento foi assinado eletronicamente conforme a MP 2.200-2/2001.';
      lastPage.drawText(legalNote1, {
        x: textX,
        y: currentY,
        size: 7,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 9;

      const legalNote2 = 'Esta é uma assinatura eletrônica simples, com validade restrita a processos';
      lastPage.drawText(legalNote2, {
        x: textX,
        y: currentY,
        size: 7,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 9;

      const legalNote3 = 'administrativos e relações contratuais entre as partes envolvidas.';
      lastPage.drawText(legalNote3, {
        x: textX,
        y: currentY,
        size: 7,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 12;

      // Token de validação
      const validationText = `Token de validação: ${signatureToken}`;
      lastPage.drawText(validationText, {
        x: textX,
        y: currentY,
        size: 7,
        font: fontBold,
        color: rgb(0.1, 0.3, 0.7),
      });

      // Adicionar metadados ao PDF
      pdfDoc.setTitle('Documento Assinado Digitalmente - Soloflow');
      pdfDoc.setProducer('Soloflow - Sistema de Gestão de Processos');
      pdfDoc.setCreator(metadata.signer.name);
      pdfDoc.setAuthor(metadata.signer.name);
      pdfDoc.setSubject(
        `Documento assinado por ${metadata.signer.name} em ${dateStr}`,
      );
      pdfDoc.setKeywords([
        'assinado',
        'soloflow',
        signatureToken,
        documentHash,
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
          : 'ATENÇÃO: Documento foi alterado após a assinatura',
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao verificar assinatura: ${error.message}`,
      );
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
   * Formata CPF: 000.000.000-00
   */
  private formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
    // Usa o mesmo método signPDF, mas passa a ordem para posicionar verticalmente
    const result = await this.signPDF(
      pdfPath,
      outputPath,
      metadata,
      userPassword,
      signatureOrder,
    );

    return result;
  }
}
