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

      // Prepare SendPulse API request
      const sendpulsePayload = {
        email: email,
        name: name,
        phone: phone || '',
        custom_fields: fields || {},
      };

      // Get API key from environment variable
      const apiKey = env.SENDPULSE_API_KEY;
      if (!apiKey) {
        console.error('SENDPULSE_API_KEY not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Call SendPulse API to add contact
      const sendpulseResponse = await fetch('https://api.sendpulse.com/addressbooks/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(sendpulsePayload),
      });

      // Check SendPulse response
      if (!sendpulseResponse.ok) {
        const errorText = await sendpulseResponse.text();
        console.error('SendPulse API error:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to save contact' }), {
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
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
