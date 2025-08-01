// /api/create-stripe-link.js (Vercel function)
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { referral_code } = req.body;

  // 1. Find affiliate in Supabase
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('referral_code', referral_code)
    .single();

  if (!affiliate) {
    return res.status(400).json({ error: 'Affiliate not found' });
  }

  // 2. Create account link
  const account = await stripe.accounts.create({ type: 'express' });

  // 3. Save account ID to Supabase
  await supabase
    .from('affiliates')
    .update({ stripe_account_id: account.id })
    .eq('id', affiliate.id);

  // 4. Create Stripe onboarding link
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://topten.keyninestudios.com/stripe-connect.html',
    return_url: 'https://topten.keyninestudios.com/connected.html',
    type: 'account_onboarding',
  });

  res.status(200).json({ url: link.url });
}
