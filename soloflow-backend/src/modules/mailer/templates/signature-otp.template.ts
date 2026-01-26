export function signatureOtpTemplate(userName: string, otpCode: string, logoUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codigo de Verificacao - Assinatura Digital - SoloFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #e2e8f0;">
          <!-- Barra de accent -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #3b82f6 100%); height: 5px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Header com Logo -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="${logoUrl}" alt="SoloFlow" width="160" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" />
            </td>
          </tr>
          <!-- Corpo -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <!-- Icone de assinatura -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 14px; line-height: 56px; text-align: center; border: 1px solid #a7f3d0;">
                  <span style="font-size: 24px;">&#9997;</span>
                </div>
              </div>
              <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 22px; font-weight: 700; text-align: center; letter-spacing: -0.02em;">Assinatura Digital</h2>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; text-align: center;">Codigo de verificacao para assinatura</p>

              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #475569; font-size: 15px; line-height: 1.6;">
                  Ola, <strong style="color: #1e293b;">${userName}</strong>
                </p>
                <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
                  Voce solicitou a assinatura de um documento. Use o codigo abaixo para confirmar sua identidade:
                </p>
              </div>

              <!-- Codigo OTP -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0 28px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px 40px;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0369a1; font-family: 'Courier New', monospace;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Info de expiracao -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                      <strong>&#9201; Atencao:</strong> Este codigo expira em <strong>5 minutos</strong> por motivos de seguranca.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center;">
                Se voce nao solicitou esta assinatura, ignore este e-mail.<br>Nenhuma acao sera realizada sem o codigo.
              </p>
            </td>
          </tr>
          <!-- Divisor -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: #e2e8f0;"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 28px; text-align: center;">
              <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                E-mail enviado automaticamente pelo sistema <strong style="color: #64748b;">SoloFlow</strong>
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                Assinatura Digital &bull; Por favor, nao responda a esta mensagem.
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
