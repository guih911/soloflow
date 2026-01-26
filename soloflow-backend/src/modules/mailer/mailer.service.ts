import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { passwordResetTemplate } from './templates/password-reset.template';
import { signatureOtpTemplate } from './templates/signature-otp.template';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('Transporter SMTP configurado com sucesso');
    } else {
      this.logger.warn('SMTP_USER/SMTP_PASS não configurados. E-mails não serão enviados.');
    }
  }

  async sendSignatureOtpEmail(email: string, userName: string, otpCode: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email de OTP de assinatura não enviado (SMTP não configurado): ${email}`);
      return;
    }

    const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
    const html = signatureOtpTemplate(userName, otpCode);

    try {
      await this.transporter.sendMail({
        from: `"SoloFlow" <${from}>`,
        to: email,
        subject: 'Código de Verificação - Assinatura Digital - SoloFlow',
        html,
      });
      this.logger.log(`Email de OTP de assinatura enviado para: ${email}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar email de OTP para ${email}: ${error.message}`);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, userName: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email de reset não enviado (SMTP não configurado): ${email}`);
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/redefinir-senha?token=${token}`;
    const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
    const html = passwordResetTemplate(userName, resetUrl);

    try {
      await this.transporter.sendMail({
        from: `"SoloFlow" <${from}>`,
        to: email,
        subject: 'Recuperação de Senha - SoloFlow',
        html,
      });
      this.logger.log(`Email de recuperação enviado para: ${email}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar email para ${email}: ${error.message}`);
      throw error;
    }
  }
}
