/**
 * Cloudflare Pages Function - SendPulse Proxy + Email via Resend
 * Accessible at /api/sendpulse on the Pages site
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const ADDRESSBOOK_ID = '816467';
const NOTIFY_EMAIL = 'timepaula2026@gmail.com';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders,
    });
  }

  try {
    const payload = await request.json();
    const { email, name, phone, fields, formType } = payload;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email and name are required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const clientId = (env.SENDPULSE_CLIENT_ID || '').trim();
    const clientSecret = (env.SENDPULSE_CLIENT_SECRET || '').trim();
    const resendKey = (env.RESEND_API_KEY || '').trim();

    // === 1. SendPulse ===
    if (clientId && clientSecret) {
      const tokenResponse = await fetch('https://api.sendpulse.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (tokenResponse.ok) {
        const { access_token } = await tokenResponse.json();
        await fetch(`https://api.sendpulse.com/addressbooks/${ADDRESSBOOK_ID}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`,
          },
          body: JSON.stringify({
            emails: [{ email, variables: { Name: name, Phone: phone || '', ...(fields || {}) } }],
          }),
        });
      }
    }

    // === 2. Email via Resend ===
    if (resendKey) {
      const tipo = formType || 'Formulário';
      const extraFields = fields ? Object.entries(fields).map(([k, v]) => `<tr><td style="padding:6px 12px;color:#666">${k}</td><td style="padding:6px 12px">${v}</td></tr>`).join('') : '';

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Site Paula Batista <onboarding@resend.dev>',
          to: [NOTIFY_EMAIL],
          subject: `🔔 Novo lead: ${tipo} — ${name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
              <h2 style="background:#1a1a2e;color:#fff;padding:16px 20px;margin:0;border-radius:8px 8px 0 0">
                Novo Lead — ${tipo}
              </h2>
              <table style="width:100%;border-collapse:collapse;background:#f9f9f9;border-radius:0 0 8px 8px">
                <tr><td style="padding:6px 12px;color:#666">Nome</td><td style="padding:6px 12px"><strong>${name}</strong></td></tr>
                <tr style="background:#fff"><td style="padding:6px 12px;color:#666">Email</td><td style="padding:6px 12px">${email}</td></tr>
                <tr><td style="padding:6px 12px;color:#666">WhatsApp</td><td style="padding:6px 12px">${phone || '—'}</td></tr>
                ${extraFields}
              </table>
              <p style="color:#999;font-size:12px;margin-top:12px">Enviado via paulabatista.com.br</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Contact added successfully' }), {
      status: 200, headers: corsHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', detail: error.message }), {
      status: 500, headers: corsHeaders,
    });
  }
}
