export function signatureOtpTemplate(userName: string, otpCode: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - Assinatura Digital - SoloFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1e40af; letter-spacing: -0.5px;">SoloFlow</h1>
            </td>
          </tr>
          <!-- Corpo -->
          <tr>
            <td style="padding: 32px 0;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">Assinatura Digital</h2>

              <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>
              </p>

              <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                Você solicitou a assinatura de um documento. Use o código abaixo para confirmar sua identidade:
              </p>

              <!-- Código OTP -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <div style="display: inline-block; background-color: #f3f4f6; border-radius: 8px; padding: 16px 32px;">
                      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e40af; font-family: 'Courier New', monospace;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Este código expira em <strong>5 minutos</strong>.
              </p>

              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Se você não solicitou esta assinatura, ignore este e-mail.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                SoloFlow - Assinatura Digital
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
