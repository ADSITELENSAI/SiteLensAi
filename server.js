// server.js
// Static file server + Stripe webhook handler for SiteLens.
//
// What this does:
//  - Serves index.html / script.js as before (unchanged behavior)
//  - Listens for Stripe webhook events at POST /webhook
//  - When someone completes checkout, looks up WHICH SiteLens user paid
//    (via client_reference_id, set in script.js) and records their plan
//    in Supabase so the app knows they're a paying customer
//
// Required environment variables (put these in a local .env file —
// see .env.example — never hardcode secrets here or paste them in chat):
//   STRIPE_SECRET_KEY          - starts with sk_live_... or sk_test_...
//   STRIPE_WEBHOOK_SECRET      - starts with whsec_..., from the Stripe Dashboard
//   SUPABASE_SERVICE_ROLE_KEY  - from Supabase Dashboard > Settings > API
//                                (NOT the anon key — this one bypasses RLS,
//                                 so it must only ever live on the server)

require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = 'https://sqpmgsruzkvxqkxawppw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Map your Stripe Price IDs to plan names ─────────────────────────────
// Fill these in once you've created your Growth/Pro Prices in Stripe.
// (Price IDs look like "price_1AbCdEfGhIjKlMnO" — these are NOT secret,
// safe to share/paste anywhere.)
const PLAN_BY_PRICE_ID = {
  'price_REPLACE_WITH_GROWTH_PRICE_ID': 'Growth',
  'price_REPLACE_WITH_PRO_PRICE_ID': 'Pro',
};

// ── Supabase helpers (server-side only, uses the service role key) ──────
async function upsertProfile(userId, fields) {
  if (!userId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ id: userId, ...fields, updated_at: new Date().toISOString() }),
    });
  } catch (e) {
    console.error('Supabase upsertProfile error:', e);
  }
}

async function updateProfileByCustomerId(customerId, fields) {
  if (!customerId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
    });
  } catch (e) {
    console.error('Supabase updateProfileByCustomerId error:', e);
  }
}

// ── Stripe webhook ────────────────────────────────────────────────────
// IMPORTANT: this route must use express.raw() (not express.json()) because
// Stripe's signature check needs the exact, untouched request body.
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Fires once when someone finishes paying
      case 'checkout.session.completed': {
        const session = event.data.object;
        const supabaseUserId = session.client_reference_id; // set by script.js at redirect time
        const customerId = session.customer;

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        const plan = PLAN_BY_PRICE_ID[priceId] || 'Unknown';

        await upsertProfile(supabaseUserId, { plan, stripe_customer_id: customerId });
        console.log(`Checkout complete: user ${supabaseUserId} -> ${plan}`);
        break;
      }

      // Fires when a subscription is canceled — drop them back to Starter
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await updateProfileByCustomerId(subscription.customer, { plan: 'Starter' });
        break;
      }

      default:
        // Other event types are ignored for now
        break;
    }
  } catch (err) {
    console.error('Error handling webhook event:', err);
  }

  res.json({ received: true });
});

// ── Static file serving (unchanged from before) ──────────────────────
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SiteLens running at http://localhost:${PORT}`);
});