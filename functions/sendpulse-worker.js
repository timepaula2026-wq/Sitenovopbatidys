/**
 * Cloudflare Worker - SendPulse Proxy
 *
 * Handles form submissions from Paula Batista site and forwards to SendPulse API
 * Keeps API key secure server-side via environment variables
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const ADDRESSBOOK_ID = '816467';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // Parse incoming form data
      const payload = await request.json();
      const { email, name, phone, fields } = payload;

      // Validate required fields
      if (!email || !name) {
        return new Response(JSON.stringify({ error: 'Email and name are required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Get API key from environment variable
      const apiKey = (env.SENDPULSE_API_KEY || '').trim();
      const userId = (env.SENDPULSE_USER_ID || '').trim();

      if (!apiKey || !userId) {
        console.error('SENDPULSE credentials not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Step 1: Get OAuth access token from SendPulse
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
        console.error('SendPulse OAuth error:', tokenError);
        return new Response(JSON.stringify({ error: 'Authentication failed', detail: tokenError }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const tokenData = await tokenResponse.json();
      const authToken = tokenData.access_token;

      // Step 2: Add email to addressbook
      const sendpulsePayload = {
        emails: [
          {
            email: email,
            variables: {
              Name: name,
              Phone: phone || '',
              ...(fields || {}),
            },
          },
        ],
      };

      const sendpulseResponse = await fetch(
        `https://api.sendpulse.com/addressbooks/${ADDRESSBOOK_ID}/emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(sendpulsePayload),
        }
      );

      // Check SendPulse response
      if (!sendpulseResponse.ok) {
        const errorText = await sendpulseResponse.text();
        console.error('SendPulse API error:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to save contact', detail: errorText }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Success response
      return new Response(JSON.stringify({ success: true, message: 'Contact added successfully' }), {
        status: 200,
        headers: corsHeaders,
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error', detail: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
