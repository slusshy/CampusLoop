import { createClient } from '@supabase/supabase-js';
import { api, setAuthTokenGetter } from './api.js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const backendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = backendConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

// Synchronize session token with API client
let currentSession = null;
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    currentSession = data?.session ?? null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
  });
}

setAuthTokenGetter(
  () => currentSession?.access_token || null,
  () => currentSession?.user || null
);

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add your project URL and publishable key to .env.');
  }
  return supabase;
}

export function requireSession(session) {
  if (!session?.access_token || !session.user?.id) {
    throw new Error('Sign in to CampusLoop to do that.');
  }
  return session;
}

export function throwIfError(error) {
  if (error) throw new Error(error.message || 'The request could not be completed.');
}

const listingTypes = { sale: 'For sale', rent: 'For rent', lend: 'Free lending' };
const conditions = { like_new: 'Like new', good: 'Good', well_loved: 'Well loved' };

function photoUrl(photo) {
  if (!photo) return '';
  if (/^https?:\/\//i.test(photo) || photo.startsWith('/')) return photo;
  if (supabase) {
    return supabase.storage.from('listing-images').getPublicUrl(photo).data.publicUrl;
  }
  return photo;
}

export async function loadColleges() {
  try {
    return await api.loadColleges();
  } catch (apiError) {
    if (supabase) {
      const { data, error } = await supabase.from('colleges')
        .select('id,name,city,region').eq('active', true).order('name');
      if (!error && data?.length) return data;
    }
    throw apiError;
  }
}

export async function loadProfile(userId) {
  try {
    return await api.loadProfile(userId);
  } catch (apiError) {
    if (supabase) {
      const { data, error } = await supabase.from('profiles')
        .select('id,display_name,role,college_id,verification_status,public_id,verified_until,created_at,colleges(name)')
        .eq('id', userId).single();
      if (!error && data) return { ...data, college_name: data.colleges?.name ?? null };
    }
    throw apiError;
  }
}

export async function selectCollege(userId, collegeId) {
  try {
    return await api.selectCollege(collegeId);
  } catch (apiError) {
    if (supabase) {
      const { error } = await supabase.from('profiles').update({ college_id: collegeId }).eq('id', userId);
      throwIfError(error);
      return loadProfile(userId);
    }
    throw apiError;
  }
}

export async function loadListings(params = {}) {
  try {
    const data = await api.loadListings(params);
    return data;
  } catch (apiError) {
    if (supabase) {
      let query = supabase.from('listings')
        .select('id,seller_id,demo_seller_name,college_id,title,description,category,listing_type,price,price_unit,condition,pickup_area,available_from,available_until,status,image_paths,demo,created_at,colleges(name)')
        .eq('status', 'active');
      if (params.collegeId) query = query.eq('college_id', params.collegeId);
      if (params.category && params.category !== 'All items') query = query.eq('category', params.category);
      if (params.listingType) query = query.eq('listing_type', params.listingType);
      if (params.condition) query = query.eq('condition', params.condition);
      if (params.minPrice !== '' && params.minPrice !== undefined) query = query.gte('price', Number(params.minPrice));
      if (params.maxPrice !== '' && params.maxPrice !== undefined) query = query.lte('price', Number(params.maxPrice));
      if (params.sort === 'Price: low to high') query = query.order('price', { ascending: true });
      else if (params.sort === 'Price: high to low') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, error } = await query.limit(100);
      if (!error && data) {
        return data.map((listing) => ({
          ...listing,
          name: listing.title,
          type: listingTypes[listing.listing_type] || listing.listing_type,
          condition: conditions[listing.condition] || listing.condition,
          unit: listing.price_unit === 'total' ? '' : `/${listing.price_unit}`,
          college: listing.colleges?.name ?? 'Campus community',
          seller: listing.demo_seller_name ?? 'Campus student',
          initials: (listing.demo_seller_name || 'CL').split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase(),
          sellerVerified: false,
          imageUrl: photoUrl(listing.image_paths?.[0] || ''),
          image: listing.image_paths?.[0] || '',
        }));
      }
    }
    throw apiError;
  }
}

export async function loadDeals(params = {}) {
  try {
    return await api.loadDeals(params);
  } catch (apiError) {
    if (supabase) {
      let query = supabase.from('deals')
        .select('id,title,offer,description,category,terms,expires_at,demo,college_id,businesses(name,demo)')
        .eq('status', 'active');
      const { data, error } = await query;
      if (!error && data) {
        const tones = { Food: 'peach', Stationery: 'mint', Technology: 'lavender', Transport: 'blue' };
        const marks = { Food: '☕', Stationery: '✳', Technology: '⌘', Transport: '↗' };
        return data.map((deal) => ({
          ...deal,
          name: deal.businesses?.name ?? 'Campus business',
          detail: deal.description || deal.terms,
          expires: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(deal.expires_at)),
          tone: tones[deal.category] ?? 'lavender',
          mark: marks[deal.category] ?? '✳',
          demo: deal.demo || deal.businesses?.demo,
        }));
      }
    }
    throw apiError;
  }
}

export async function loadFavorites(userId) {
  try {
    return await api.loadFavorites();
  } catch {
    if (supabase && userId) {
      const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
      return (data ?? []).map(({ listing_id }) => listing_id);
    }
    return [];
  }
}

export async function toggleFavorite(userId, listingId, isSaved) {
  try {
    await api.toggleFavorite(listingId, isSaved);
  } catch (apiError) {
    if (supabase && userId) {
      const query = supabase.from('favorites');
      const { error } = isSaved
        ? await query.delete().eq('user_id', userId).eq('listing_id', listingId)
        : await query.insert({ user_id: userId, listing_id: listingId });
      throwIfError(error);
      return;
    }
    throw apiError;
  }
}

export async function uploadListingImage(userId, file) {
  if (!file) throw new Error('Choose an image file.');
  return await api.upload(file, 'listing-images');
}

export async function createListing(userId, values, imagePath) {
  return await api.createListing(values, imagePath);
}

export async function createItemRequest(userId, listing, message, requestedFrom, requestedUntil) {
  return await api.createItemRequest(listing.id, message, requestedFrom, requestedUntil);
}

export async function manageRequest(requestId, action, returnBy) {
  return await api.manageRequest(requestId, action, returnBy);
}

export async function reportListing(userId, listingId, reason) {
  return await api.reportListing(listingId, reason);
}

export async function requestCollege(userId, values) {
  return await api.requestCollege(values);
}

export async function submitVerification(userId, values, file) {
  let docPath = '';
  if (file) {
    docPath = await api.upload(file, 'verification-documents');
  }
  const result = await api.submitVerification(values, docPath);
  return result.submission;
}

export async function latestVerification(userId) {
  if (supabase && userId) {
    const { data } = await supabase.from('verification_submissions')
      .select('id,status,review_note,created_at,reviewed_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function invokeFunction(name, body = {}) {
  // Map legacy edge function invocations directly to our solid backend
  if (name === 'verify-student-id') return api.verifyStudentId(body.publicId);
  if (name === 'redeem-deal') return api.redeemDeal(body.dealId);
  if (name === 'validate-coupon') return api.validateCoupon(body.code);
  if (name === 'manage-request') return api.manageRequest(body.requestId, body.action, body.returnBy);
  if (name === 'admin-review') {
    if (body.action === 'queue') return api.loadAdminQueue();
    if (body.action === 'review') return api.reviewVerification(body.submissionId, body.status, body.note);
  }
  if (supabase) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw new Error(error.message);
    return data;
  }
  throw new Error(`Endpoint for ${name} could not be resolved.`);
}

export async function loadActivity(userId, type) {
  return await api.loadActivity(type);
}

export async function loadAdminQueue() {
  return await api.loadAdminQueue();
}

export async function reviewVerification(submissionId, status, note) {
  return await api.reviewVerification(submissionId, status, note);
}

export async function loadAdminResource(resource) {
  return await api.loadAdminResource(resource);
}

export async function updateAdminResource(resource, id, values) {
  return await api.updateAdminResource(resource, id, values);
}

export async function createAdminCollege(values) {
  return await api.createAdminCollege(values);
}

export async function loadAdminBusinesses() {
  return await api.loadAdminBusinesses();
}

export async function createAdminDeal(values) {
  return await api.createAdminDeal(values);
}

export async function verifyStudentId(publicId) {
  return await api.verifyStudentId(publicId);
}

export async function redeemDeal(dealId) {
  return await api.redeemDeal(dealId);
}

export async function validateCoupon(code) {
  return await api.validateCoupon(code);
}
