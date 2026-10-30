export type EmailSendResult = {
  id?: string;
  success: boolean;
  simulated?: boolean;
  error?: string;
};

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.RESEND_FROM_EMAIL || "Arieya <onboarding@resend.dev>";
  const from = params.from || defaultFrom;

  if (!apiKey) {
    console.log(`[Resend Simulated Email] To: ${params.to} | Subject: ${params.subject}`);
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[Resend Error]", data);
      return { success: false, error: data?.message || "Failed to send email via Resend" };
    }

    return { id: data.id, success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error calling Resend";
    console.error("[Resend Exception]", msg);
    return { success: false, error: msg };
  }
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  storeName: string;
  publicKey: string;
}) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://www.arieya.site";
  const dashboardUrl = `${appOrigin}/merchant`;
  const previewUrl = `${appOrigin}/stylist?store=${params.publicKey}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Arieya</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f5ef; color: #233428; margin: 0; padding: 40px 20px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2ddd0; border-radius: 8px; padding: 36px 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
          <div style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #9f7b44; letter-spacing: 0.05em; margin-bottom: 24px;">ARIEYA</div>
          <h1 style="font-size: 22px; font-weight: 600; color: #1e2e23; margin: 0 0 16px;">Welcome to your store studio, ${params.name}.</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #556256; margin: 0 0 20px;">
            Your store workspace for <strong>${params.storeName}</strong> is ready. Arieya turns your existing product catalogue into an intelligent, conversational discovery advisor on your website.
          </p>

          <div style="background: #fbfaf6; border: 1px solid #ebe5d8; border-radius: 6px; padding: 18px; margin: 24px 0;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8e7240; font-weight: bold; margin-bottom: 10px;">Your 3-Step Launch Checklist</div>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #3b4c3e;">
              <li><strong>Import your catalogue:</strong> Upload a CSV, JSON, or XML feed in your studio.</li>
              <li><strong>Test the advisor:</strong> Ask 3 test questions to verify recommendations.</li>
              <li><strong>Embed on your store:</strong> Add our zero-dependency script block before &lt;/body&gt;.</li>
            </ol>
          </div>

          <div style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #2f4d3c; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 4px;">Open Merchant Studio &rarr;</a>
            <a href="${previewUrl}" style="display: inline-block; margin-left: 12px; color: #8e7240; text-decoration: none; font-size: 13px; font-weight: 500;">Shopper Preview &rarr;</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #ebe5d8; margin: 32px 0 20px;" />
          <p style="font-size: 11px; color: #8a968a; line-height: 1.5; margin: 0;">
            Questions? Reply directly to this email or contact support@arieya.site.<br />
            &copy; ${new Date().getFullYear()} Arieya. Conversational product discovery for online stores.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: `Welcome to Arieya · Your store studio for ${params.storeName}`,
    html,
    text: `Welcome to Arieya, ${params.name}!\n\nYour workspace for ${params.storeName} is ready.\n\nOpen Merchant Studio: ${dashboardUrl}\nTest Shopper Preview: ${previewUrl}\n\nHappy discovering!\nThe Arieya Team`,
  });
}

export async function sendQuotaWarningEmail(params: {
  to: string;
  name: string;
  storeName: string;
  sessionsUsed: number;
  allowance: number;
  percent: number;
}) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://www.arieya.site";
  const billingUrl = `${appOrigin}/merchant`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f7f5ef; color: #233428; padding: 40px 20px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2ddd0; border-radius: 8px; padding: 32px;">
          <div style="font-family: Georgia, serif; font-size: 24px; color: #9f7b44; font-weight: bold; margin-bottom: 20px;">ARIEYA</div>
          <h1 style="font-size: 20px; color: #203325; margin: 0 0 14px;">Discovery quota update for ${params.storeName}</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #556256;">
            Your store has reached <strong>${params.percent}%</strong> of its monthly discovery session allowance (${params.sessionsUsed} of ${params.allowance} sessions used).
          </p>
          <div style="margin: 24px 0;">
            <a href="${billingUrl}" style="background: #2f4d3c; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 22px; border-radius: 4px;">Review Plans & Upgrade &rarr;</a>
          </div>
          <p style="font-size: 12px; color: #8a968a;">Upgrades take effect immediately so shoppers will never experience an interrupted discovery advisor.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: `Notice: ${params.storeName} reached ${params.percent}% of monthly discovery quota`,
    html,
  });
}
