
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const Stripe     = require('stripe');
const OpenAI     = require('openai');
const rateLimit  = require('express-rate-limit');
const crypto     = require('crypto');
 
const app    = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend   = new Resend(process.env.RESEND_API_KEY);
const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY);
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 
/* ── MIDDLEWARE ── */
app.use(cors({ origin: '*' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.static('.'));
 
/* ── RATE LIMITERS ── */
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many attempts. Try again in 15 minutes.' } });
const analyzeLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Slow down — max 5 analyses per minute.' } });
 
/* ── AUTH MIDDLEWARE ── */
function requireAuth(req, res, next) {
 const token = req.headers.authorization?.replace('Bearer ', '');
 if (!token) return res.status(401).json({ error: 'Not authenticated.' });
 try {
   req.user = jwt.verify(token, process.env.JWT_SECRET);
   next();
 } catch {
   res.status(401).json({ error: 'Session expired. Please sign in again.' });
 }
}
 
/* ── EMAIL HELPERS ── */
async function sendVerificationEmail(email, firstName, token) {
 const link = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
 await resend.emails.send({
   from: process.env.FROM_EMAIL,
   to: email,
   subject: 'Verify your SiteLens account',
   html: `
     <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#050709;color:#e8edf2;border-radius:16px;overflow:hidden">
       <div style="background:linear-gradient(135deg,#0077ff,#00c2ff);padding:32px;text-align:center">
         <h1 style="margin:0;color:#fff;font-size:28px;letter-spacing:-0.03em">Site<span style="color:#fff;opacity:.8">Lens</span></h1>
       </div>
       <div style="padding:40px 36px">
         <h2 style="color:#fff;margin-bottom:12px">Hey ${firstName}, verify your email</h2>
         <p style="color:#6b7a8d;line-height:1.7;margin-bottom:28px">
           You're one click away from seeing exactly what your website is missing.
           Click below to verify your account and get your free analysis.
         </p>
         <a href="${link}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0077ff,#00c2ff);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px">
           Verify My Account →
         </a>
         <p style="color:#4a5568;font-size:13px;margin-top:24px">
           This link expires in 24 hours. If you didn't create a SiteLens account, ignore this email.
         </p>
       </div>
     </div>
   `
 });
}
 
async function sendWelcomeEmail(email, firstName) {
 await resend.emails.send({
   from: process.env.FROM_EMAIL,
   to: email,
   subject: 'Welcome to SiteLens 🚀',
   html: `
     <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#050709;color:#e8edf2;border-radius:16px;overflow:hidden">
       <div style="background:linear-gradient(135deg,#0077ff,#00c2ff);padding:32px;text-align:center">
         <h1 style="margin:0;color:#fff;font-size:28px">SiteLens</h1>
       </div>
       <div style="padding:40px 36px">
         <h2 style="color:#fff;margin-bottom:12px">You're in, ${firstName}! 🎉</h2>
         <p style="color:#6b7a8d;line-height:1.7;margin-bottom:20px">
           Your account is verified and ready. You have <strong style="color:#00c2ff">1 free website analysis</strong> to use.
           Head back to SiteLens and enter your URL to see how your site stacks up against competitors.
         </p>
         <p style="color:#6b7a8d;line-height:1.7">
           When you're ready to unlock unlimited analyses, competitor deep-dives, and weekly tracking —
           upgrade to Growth for $49/mo.
         </p>
         <a href="${process.env.APP_URL}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:linear-gradient(135deg,#0077ff,#00c2ff);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px">
           Analyze My Website →
         </a>
       </div>
     </div>
   `
 });
}
 
/* ══════════════════════════════════════════════════════
  AUTH ROUTES
══════════════════════════════════════════════════════ */
 
/* REGISTER */
app.post('/api/auth/register', authLimiter, async (req, res) => {
 try {
   const { firstName, lastName, email, password } = req.body;
   if (!firstName || !lastName || !email || !password)
     return res.status(400).json({ error: 'All fields are required.' });
   if (!/\S+@\S+\.\S+/.test(email))
     return res.status(400).json({ error: 'Invalid email address.' });
   if (password.length < 8)
     return res.status(400).json({ error: 'Password must be at least 8 characters.' });
 
   /* Check if email already exists */
   const { data: existing } = await supabase
     .from('users').select('id').eq('email', email.toLowerCase()).single();
   if (existing)
     return res.status(400).json({ error: 'An account with this email already exists.' });
 
   /* Hash password & create verify token */
   const passwordHash  = await bcrypt.hash(password, 12);
   const verifyToken   = crypto.randomBytes(32).toString('hex');
   const tokenExpires  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
 
   /* Insert user */
   const { data: user, error } = await supabase.from('users').insert({
     email: email.toLowerCase(),
     password_hash: passwordHash,
     first_name: firstName,
     last_name: lastName,
     plan: 'free',
     is_verified: false,
     verify_token: verifyToken,
     verify_token_expires: tokenExpires,
     analyses_used: 0
   }).select().single();
 
   if (error) throw error;
 
   /* Send verification email */
   await sendVerificationEmail(email, firstName, verifyToken);
 
   res.json({ success: true, message: 'Account created! Check your email to verify your account.' });
 } catch (err) {
   console.error('Register error:', err);
   res.status(500).json({ error: 'Something went wrong. Please try again.' });
 }
});
 
/* VERIFY EMAIL */
app.get('/api/auth/verify', async (req, res) => {
 try {
   const { token } = req.query;
   if (!token) return res.redirect('/?error=invalid-token');
 
   const { data: user } = await supabase
     .from('users')
     .select('*')
     .eq('verify_token', token)
     .single();
 
   if (!user) return res.redirect('/?error=invalid-token');
   if (new Date(user.verify_token_expires) < new Date())
     return res.redirect('/?error=token-expired');
 
   /* Mark verified */
   await supabase.from('users').update({
     is_verified: true,
     verify_token: null,
     verify_token_expires: null
   }).eq('id', user.id);
 
   /* Send welcome email */
   await sendWelcomeEmail(user.email, user.first_name);
 
   /* Redirect to site with success flag */
   res.redirect('/?verified=true');
 } catch (err) {
   console.error('Verify error:', err);
   res.redirect('/?error=server-error');
 }
});
 
/* SIGN IN */
app.post('/api/auth/login', authLimiter, async (req, res) => {
 try {
   const { email, password } = req.body;
   if (!email || !password)
     return res.status(400).json({ error: 'Email and password are required.' });
 
   const { data: user } = await supabase
     .from('users').select('*').eq('email', email.toLowerCase()).single();
 
   if (!user || !(await bcrypt.compare(password, user.password_hash)))
     return res.status(401).json({ error: 'Incorrect email or password.' });
 
   if (!user.is_verified)
     return res.status(403).json({ error: 'Please verify your email before signing in. Check your inbox.' });
 
   const token = jwt.sign(
     { id: user.id, email: user.email, plan: user.plan },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
 
   res.json({
     success: true,
     token,
     user: { firstName: user.first_name, lastName: user.last_name, email: user.email, plan: user.plan, analysesUsed: user.analyses_used }
   });
 } catch (err) {
   console.error('Login error:', err);
   res.status(500).json({ error: 'Something went wrong. Please try again.' });
 }
});
 
/* GET CURRENT USER */
app.get('/api/auth/me', requireAuth, async (req, res) => {
 try {
   const { data: user } = await supabase
     .from('users').select('*').eq('id', req.user.id).single();
   if (!user) return res.status(404).json({ error: 'User not found.' });
   res.json({
     firstName: user.first_name, lastName: user.last_name,
     email: user.email, plan: user.plan, analysesUsed: user.analyses_used
   });
 } catch (err) {
   res.status(500).json({ error: 'Could not fetch user.' });
 }
});
 
/* ══════════════════════════════════════════════════════
  ANALYZE ROUTE
══════════════════════════════════════════════════════ */
app.post('/api/analyze', requireAuth, analyzeLimiter, async (req, res) => {
 try {
   const { url } = req.body;
   if (!url) return res.status(400).json({ error: 'URL is required.' });
 
   /* Fetch latest user data */
   const { data: user } = await supabase
     .from('users').select('*').eq('id', req.user.id).single();
   if (!user) return res.status(404).json({ error: 'User not found.' });
 
   /* Check plan limits */
   if (user.plan === 'free' && user.analyses_used >= 1) {
     return res.status(403).json({
       error: 'free_limit_reached',
       message: 'You\'ve used your free analysis. Upgrade to Growth for unlimited analyses.'
     });
   }
 
   /* Run AI analysis */
   const prompt = `You are SiteLens, an expert AI website analyzer for small businesses.
The user submitted this URL: ${url}
 
Analyze this website as a world-class digital marketing expert. Be specific and realistic based on what this type of business typically needs.
Return ONLY valid JSON with no markdown or backticks:
{
 "score": <number 0-100>,
 "domain": "<clean domain name>",
 "summary": "<2 sentence expert overview of this site and its main opportunity>",
 "strengths": ["<specific strength 1>","<specific strength 2>","<specific strength 3>"],
 "issues": [
   {"priority":"HIGH","title":"<specific issue>","detail":"<exactly what to fix and how>","impact":"<dollar or % business impact>"},
   {"priority":"HIGH","title":"<specific issue>","detail":"<exactly what to fix and how>","impact":"<dollar or % business impact>"},
   {"priority":"MEDIUM","title":"<specific issue>","detail":"<exactly what to fix and how>","impact":"<dollar or % business impact>"},
   {"priority":"MEDIUM","title":"<specific issue>","detail":"<exactly what to fix and how>","impact":"<dollar or % business impact>"},
   {"priority":"LOW","title":"<specific issue>","detail":"<exactly what to fix and how>","impact":"<dollar or % business impact>"}
 ],
 "competitors": ["<real competitor domain 1>","<real competitor domain 2>","<real competitor domain 3>"],
 "metrics": {
   "seo": <0-100>,
   "speed": <0-100>,
   "mobile": <0-100>,
   "design": <0-100>,
   "conversion": <0-100>
 }
}`;
 
   const completion = await openai.chat.completions.create({
     model: 'gpt-4o',
     max_tokens: 1400,
     temperature: 0.4,
     messages: [{ role: 'user', content: prompt }]
   });
 
   const text  = completion.choices[0].message.content;
   const clean = text.replace(/```json|```/g, '').trim();
   const report = JSON.parse(clean);
 
   /* Increment usage */
   await supabase.from('users').update({ analyses_used: user.analyses_used + 1 }).eq('id', user.id);
 
   /* Save analysis to DB */
   await supabase.from('analyses').insert({ user_id: user.id, url, result: report });
 
   /* If free plan, mark as blurred (frontend handles display) */
   const isFreeFirstUse = user.plan === 'free' && user.analyses_used === 0;
 
   res.json({ success: true, report, blurred: false, firstFreeUse: isFreeFirstUse });
 } catch (err) {
   console.error('Analyze error:', err);
   res.status(500).json({ error: 'Analysis failed. Please try again.' });
 }
});
 
/* ══════════════════════════════════════════════════════
  STRIPE ROUTES
══════════════════════════════════════════════════════ */
 
/* Create checkout session */
app.post('/api/stripe/checkout', requireAuth, async (req, res) => {
 try {
   const { plan } = req.body;
   const priceId = plan === 'pro'
     ? process.env.STRIPE_PRO_PRICE_ID
     : process.env.STRIPE_GROWTH_PRICE_ID;
 
   const { data: user } = await supabase
     .from('users').select('*').eq('id', req.user.id).single();
 
   /* Create or reuse Stripe customer */
   let customerId = user.stripe_customer_id;
   if (!customerId) {
     const customer = await stripe.customers.create({ email: user.email, name: `${user.first_name} ${user.last_name}` });
     customerId = customer.id;
     await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
   }
 
   const session = await stripe.checkout.sessions.create({
     customer: customerId,
     payment_method_types: ['card'],
     line_items: [{ price: priceId, quantity: 1 }],
     mode: 'subscription',
     success_url: `${process.env.APP_URL}/?upgraded=true`,
     cancel_url:  `${process.env.APP_URL}/?cancelled=true`,
     subscription_data: { trial_period_days: plan === 'growth' ? 7 : 0 }
   });
 
   res.json({ url: session.url });
 } catch (err) {
   console.error('Stripe error:', err);
   res.status(500).json({ error: 'Could not create checkout session.' });
 }
});
 
/* Stripe webhook — updates plan in DB when payment succeeds/cancels */
app.post('/api/stripe/webhook', async (req, res) => {
 let event;
 try {
   event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
 } catch {
   return res.status(400).json({ error: 'Webhook signature invalid.' });
 }
 
 try {
   if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
     const sub = event.data.object;
     const priceId = sub.items.data[0].price.id;
     const plan = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'growth';
     await supabase.from('users').update({ plan, stripe_subscription_id: sub.id }).eq('stripe_customer_id', sub.customer);
   }
 
   if (event.type === 'customer.subscription.deleted') {
     const sub = event.data.object;
     await supabase.from('users').update({ plan: 'free' }).eq('stripe_customer_id', sub.customer);
   }
 
   res.json({ received: true });
 } catch (err) {
   console.error('Webhook error:', err);
   res.status(500).json({ error: 'Webhook processing failed.' });
 }
});
 
/* ── START SERVER ── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ SiteLens server running at http://localhost:${PORT}`));
