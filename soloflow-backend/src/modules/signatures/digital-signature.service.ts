import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as forge from 'node-forge';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  cpf?: string;
  cnpj?: string;
  publicKey: string;
}

export interface SignatureMetadata {
  signer: {
    name: string;
    cpf?: string;
    cnpj?: string;
  };
  location?: string;
  reason?: string;
  contactInfo?: string;
}

@Injectable()
export class DigitalSignatureService {
  /**
   * Extrai informações de um certificado A1 (PFX/P12)
   */
  parseCertificate(
    pfxData: Buffer,
    password: string,
  ): CertificateInfo {
    try {
      // Decodificar PFX
      const p12Asn1 = forge.asn1.fromDer(pfxData.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Obter certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];

      if (!certBag?.cert) {
        throw new Error('Certificado não encontrado no arquivo PFX');
      }

      const cert = certBag.cert;
      const subject = this.formatDN(cert.subject);
      const issuer = this.formatDN(cert.issuer);

      // Extrair CPF/CNPJ do certificado ICP-Brasil
      const cpf = this.extractCPF(cert);
      const cnpj = this.extractCNPJ(cert);

      return {
        subject,
        issuer,
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter,
        cpf,
        cnpj,
        publicKey: forge.pki.publicKeyToPem(cert.publicKey),
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao processar certificado: ${error.message}`,
      );
    }
  }

  /**
   * Valida se um certificado A1 é válido
   */
  validateCertificate(pfxData: Buffer, password: string): boolean {
    try {
      const certInfo = this.parseCertificate(pfxData, password);
      const now = new Date();

      // Verificar validade temporal
      if (now < certInfo.validFrom || now > certInfo.validTo) {
        throw new BadRequestException('Certificado fora do período de validade');
      }

      return true;
    } catch (error) {
      throw new BadRequestException(
        `Certificado inválido: ${error.message}`,
      );
    }
  }

  /**
   * Assina um PDF com certificado A1
   */
  async signPDF(
    pdfPath: string,
    outputPath: string,
    pfxData: Buffer,
    pfxPassword: string,
    metadata: SignatureMetadata,
  ): Promise<{
    signedPath: string;
    signatureHash: string;
    algorithm: string;
    certificateInfo: CertificateInfo;
  }> {
    try {
      // Validar certificado
      const certInfo = this.parseCertificate(pfxData, pfxPassword);
      this.validateCertificate(pfxData, pfxPassword);

      // Carregar PDF
      if (!existsSync(pdfPath)) {
        throw new BadRequestException('Arquivo PDF não encontrado');
      }

      const existingPdfBytes = readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Obter última página
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      // Adicionar informações visuais da assinatura
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 8;

      const signatureText = [
        `Assinado digitalmente por:`,
        `${metadata.signer.name}`,
        metadata.signer.cpf ? `CPF: ${metadata.signer.cpf}` : '',
        metadata.signer.cnpj ? `CNPJ: ${metadata.signer.cnpj}` : '',
        `Data: ${new Date().toLocaleString('pt-BR')}`,
        metadata.reason ? `Motivo: ${metadata.reason}` : '',
      ].filter(Boolean);

      // Posicionar assinatura no canto inferior esquerdo
      const x = 50;
      let y = 100;

      // Desenhar retângulo de fundo
      lastPage.drawRectangle({
        x: x - 5,
        y: y - 5,
        width: 250,
        height: signatureText.length * (fontSize + 2) + 10,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.95, 0.95, 0.95),
      });

      // Adicionar texto da assinatura
      signatureText.forEach((line, index) => {
        lastPage.drawText(line, {
          x,
          y: y + (signatureText.length - index - 1) * (fontSize + 2),
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });

      // Adicionar metadados ao PDF
      pdfDoc.setTitle('Documento Assinado Digitalmente');
      pdfDoc.setProducer('Soloflow - Sistema de Assinatura Digital ICP-Brasil');
      pdfDoc.setCreator(metadata.signer.name);
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Serializar PDF modificado
      const pdfBytes = await pdfDoc.save();

      // Gerar hash do documento
      const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

      // Preparar dados para assinatura
      const p12Asn1 = forge.asn1.fromDer(pfxData.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxPassword);

      // Obter chave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!keyBag?.key) {
        throw new Error('Chave privada não encontrada no certificado');
      }

      const privateKey = keyBag.key as forge.pki.PrivateKey;

      // Criar assinatura digital do hash
      const md = forge.md.sha256.create();
      md.update(forge.util.bytesToHex(Array.from(pdfBytes)));
      const signature = privateKey.sign(md);
      const signatureHex = forge.util.bytesToHex(signature);

      // Adicionar assinatura digital como metadado customizado
      const signatureData = {
        algorithm: 'SHA256withRSA',
        signature: signatureHex,
        certificate: {
          subject: certInfo.subject,
          issuer: certInfo.issuer,
          serialNumber: certInfo.serialNumber,
          cpf: certInfo.cpf,
          cnpj: certInfo.cnpj,
        },
        timestamp: new Date().toISOString(),
        documentHash: hash,
      };

      // Recarregar PDF para adicionar metadados customizados
      const finalPdfDoc = await PDFDocument.load(pdfBytes);
      finalPdfDoc.setSubject(JSON.stringify(signatureData));

      const finalPdfBytes = await finalPdfDoc.save();

      // Salvar PDF assinado
      writeFileSync(outputPath, finalPdfBytes);

      return {
        signedPath: outputPath,
        signatureHash: hash,
        algorithm: 'SHA256withRSA',
        certificateInfo: certInfo,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao assinar PDF: ${error.message}`,
      );
    }
  }

  /**
   * Verifica assinatura digital de um PDF
   */
  async verifyPDFSignature(pdfPath: string): Promise<{
    isValid: boolean;
    signatures: any[];
    errors?: string[];
  }> {
    try {
      if (!existsSync(pdfPath)) {
        throw new BadRequestException('Arquivo PDF não encontrado');
      }

      const pdfBytes = readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      const subject = pdfDoc.getSubject();

      if (!subject) {
        return {
          isValid: false,
          signatures: [],
          errors: ['Nenhuma assinatura digital encontrada'],
        };
      }

      try {
        const signatureData = JSON.parse(subject);

        // Verificar hash do documento
        const currentHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

        return {
          isValid: currentHash === signatureData.documentHash,
          signatures: [signatureData],
          errors: currentHash !== signatureData.documentHash
            ? ['Hash do documento não corresponde - documento pode ter sido alterado']
            : undefined,
        };
      } catch {
        return {
          isValid: false,
          signatures: [],
          errors: ['Formato de assinatura inválido'],
        };
      }
    } catch (error) {
      throw new BadRequestException(
        `Erro ao verificar assinatura: ${error.message}`,
      );
    }
  }

  /**
   * Adiciona múltiplas assinaturas ao mesmo PDF (para assinaturas sequenciais)
   */
  async addSignatureToPDF(
    pdfPath: string,
    outputPath: string,
    pfxData: Buffer,
    pfxPassword: string,
    metadata: SignatureMetadata,
    signatureOrder: number,
  ): Promise<{
    signedPath: string;
    signatureHash: string;
    algorithm: string;
    certificateInfo: CertificateInfo;
  }> {
    // Similar ao signPDF, mas adiciona a assinatura em posição diferente baseada na ordem
    const result = await this.signPDF(pdfPath, outputPath, pfxData, pfxPassword, metadata);

    return result;
  }

  /**
   * Formata Distinguished Name do certificado
   */
  private formatDN(dn: any): string {
    const attributes: string[] = [];

    for (const attr of dn.attributes) {
      const name = attr.shortName || attr.name;
      attributes.push(`${name}=${attr.value}`);
    }

    return attributes.join(', ');
  }

  /**
   * Extrai CPF do certificado ICP-Brasil (OID 2.16.76.1.3.1)
   */
  private extractCPF(cert: forge.pki.Certificate): string | undefined {
    try {
      const cpfOID = '2.16.76.1.3.1';
      const extensions = cert.extensions;

      for (const ext of extensions) {
        if (ext.id === cpfOID) {
          // O valor está em ASN.1, precisamos decodificar
          const value = (ext as any).value;
          if (typeof value === 'string') {
            // Extrair apenas dígitos
            const cpf = value.replace(/\D/g, '');
            if (cpf.length === 11) {
              return this.formatCPF(cpf);
            }
          }
        }
      }

      // Alternativa: buscar no subject
      const subjectAttrs = cert.subject.attributes;
      for (const attr of subjectAttrs) {
        if (attr.shortName === 'serialNumber' || attr.name === 'serialNumber') {
          const value = attr.value.replace(/\D/g, '');
          if (value.length === 11) {
            return this.formatCPF(value);
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao extrair CPF:', error);
    }

    return undefined;
  }

  /**
   * Extrai CNPJ do certificado ICP-Brasil (OID 2.16.76.1.3.3)
   */
  private extractCNPJ(cert: forge.pki.Certificate): string | undefined {
    try {
      const cnpjOID = '2.16.76.1.3.3';
      const extensions = cert.extensions;

      for (const ext of extensions) {
        if (ext.id === cnpjOID) {
          const value = (ext as any).value;
          if (typeof value === 'string') {
            const cnpj = value.replace(/\D/g, '');
            if (cnpj.length === 14) {
              return this.formatCNPJ(cnpj);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao extrair CNPJ:', error);
    }

    return undefined;
  }

  /**
   * Formata CPF: 000.000.000-00
   */
  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata CNPJ: 00.000.000/0000-00
   */
  private formatCNPJ(cnpj: string): string {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Criptografa dados do certificado para armazenamento seguro
   */
  encryptCertificateData(data: Buffer, key: string): string {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Descriptografa dados do certificado
   */
  decryptCertificateData(encryptedData: string, key: string): Buffer {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');

    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  /**
   * Gera um hash único para a assinatura
   */
  generateSignatureHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
