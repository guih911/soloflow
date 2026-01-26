// src/modules/lgpd/crypto.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly logger = new Logger(CryptoService.name);
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ENCRYPTION_KEY não está definida. Esta variável é obrigatória em produção para conformidade LGPD.',
        );
      }
      this.logger.warn(
        'ENCRYPTION_KEY não definida. Usando chave temporária. DEFINA UMA CHAVE FIXA EM PRODUÇÃO!',
      );
      this.encryptionKey = crypto.randomBytes(this.keyLength);
    } else {
      // Derivar chave a partir da string usando PBKDF2
      this.encryptionKey = crypto.pbkdf2Sync(
        key,
        'soloflow-lgpd-salt',
        100000,
        this.keyLength,
        'sha256'
      );
    }
  }

  /**
   * Criptografa dados sensíveis usando AES-256-GCM
   * @param plainText Texto a ser criptografado
   * @returns String criptografada no formato: iv:authTag:encrypted (base64)
   */
  encrypt(plainText: string): string {
    if (!plainText) return plainText;

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:encrypted (tudo em base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Descriptografa dados criptografados
   * @param encryptedText Texto criptografado no formato: iv:authTag:encrypted
   * @returns Texto original
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) return encryptedText;

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Se falhar, retorna o texto original (pode ser não criptografado)
      this.logger.warn(`Falha ao descriptografar: ${error.message}`);
      return encryptedText;
    }
  }

  /**
   * Gera um hash irreversível para busca (ex: CPF)
   * @param value Valor a ser hasheado
   * @returns Hash SHA-256 em hex
   */
  hash(value: string): string {
    if (!value) return value;
    return crypto
      .createHash('sha256')
      .update(value.replace(/\D/g, '')) // Remove caracteres não numéricos
      .digest('hex');
  }

  /**
   * Criptografa um CPF e retorna tanto o valor criptografado quanto o hash
   * @param cpf CPF a ser criptografado
   * @returns { encrypted, hash }
   */
  encryptCPF(cpf: string): { encrypted: string; hash: string } {
    if (!cpf) return { encrypted: '', hash: '' };

    // Normaliza o CPF (remove formatação)
    const normalizedCPF = cpf.replace(/\D/g, '');

    return {
      encrypted: this.encrypt(normalizedCPF),
      hash: this.hash(normalizedCPF),
    };
  }

  /**
   * Descriptografa um CPF
   * @param encryptedCPF CPF criptografado
   * @returns CPF original
   */
  decryptCPF(encryptedCPF: string): string {
    return this.decrypt(encryptedCPF);
  }

  /**
   * Formata um CPF descriptografado para exibição
   * @param cpf CPF (com ou sem formatação)
   * @returns CPF formatado: 000.000.000-00
   */
  formatCPF(cpf: string): string {
    if (!cpf) return cpf;
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return cpf;
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Mascara parcialmente um CPF para exibição segura
   * @param cpf CPF
   * @returns CPF mascarado: ***.***.***-00
   */
  maskCPF(cpf: string): string {
    if (!cpf) return cpf;
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return '***.***.***-**';
    return `***.***.***.${numbers.slice(-2)}`;
  }
}
