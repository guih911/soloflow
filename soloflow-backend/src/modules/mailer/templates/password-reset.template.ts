export function passwordResetTemplate(userName: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - SoloFlow</title>
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
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">Recuperação de Senha</h2>

              <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
                Olá, <strong>${userName}</strong>
              </p>

              <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
              </p>

              <!-- Botão -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0 24px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 500;">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Este link expira em <strong>1 hora</strong>.
              </p>

              <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Se você não solicitou esta redefinição, ignore este e-mail.
              </p>

              <!-- Link alternativo -->
              <p style="margin: 0 0 4px; color: #9ca3af; font-size: 12px;">Ou copie este link:</p>
              <p style="margin: 0; color: #1e40af; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                SoloFlow - Gestão de Processos
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
