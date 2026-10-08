/**
 * Cloudflare Pages Function - SendPulse Proxy
 * Accessible at /api/sendpulse on the Pages site
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const ADDRESSBOOK_ID = '816467';

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
    const { email, name, phone, fields } = payload;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email and name are required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const apiKey = (env.SENDPULSE_API_KEY || '').trim();
    const userId = (env.SENDPULSE_USER_ID || '').trim();

    if (!apiKey || !userId) {
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        debug: { hasApiKey: !!env.SENDPULSE_API_KEY, hasUserId: !!env.SENDPULSE_USER_ID }
      }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Get OAuth token
    const tokenResponse = await fetch('https://api.sendpulse.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: userId,
        client_secret: apiKey,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      return new Response(JSON.stringify({ error: 'Authentication failed', detail: tokenError }), {
        status: 500, headers: corsHeaders,
      });
    }

    const { access_token } = await tokenResponse.json();

    // Add to addressbook
    const sendpulseResponse = await fetch(
      `https://api.sendpulse.com/addressbooks/${ADDRESSBOOK_ID}/emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          emails: [{ email, variables: { Name: name, Phone: phone || '', ...(fields || {}) } }],
        }),
      }
    );

    if (!sendpulseResponse.ok) {
      const errorText = await sendpulseResponse.text();
      return new Response(JSON.stringify({ error: 'Failed to save contact', detail: errorText }), {
        status: 500, headers: corsHeaders,
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
