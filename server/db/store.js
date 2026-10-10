import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';
import { supabase, supabaseAdmin, checkSupabaseHealth } from './supabase.js';

// Seed data matching the initial schema and demo inventory
const INITIAL_COLLEGES = [
  { id: '30000000-0000-4000-8000-000000000001', name: 'Stanford University', city: 'Stanford', region: 'California', country: 'US', active: true },
  { id: '30000000-0000-4000-8000-000000000002', name: 'University of California, Berkeley', city: 'Berkeley', region: 'California', country: 'US', active: true },
  { id: '30000000-0000-4000-8000-000000000003', name: 'Massachusetts Institute of Technology', city: 'Cambridge', region: 'Massachusetts', country: 'US', active: true },
  { id: '30000000-0000-4000-8000-000000000004', name: 'IIT Bombay', city: 'Mumbai', region: 'Maharashtra', country: 'IN', active: true },
];

const INITIAL_BUSINESSES = [
  { id: '10000000-0000-4000-8000-000000000001', owner_id: null, name: 'Study Grounds', description: 'Campus coffee & bakery', verified: true, active: true, demo: true },
  { id: '10000000-0000-4000-8000-000000000002', owner_id: null, name: 'Paper & Pine', description: 'Sustainable stationery & print', verified: true, active: true, demo: true },
  { id: '10000000-0000-4000-8000-000000000003', owner_id: null, name: 'Bytewise', description: 'Student electronics & repair', verified: true, active: true, demo: true },
  { id: '10000000-0000-4000-8000-000000000004', owner_id: null, name: 'Campus Cycle Co.', description: 'Bike rentals and tuneups', verified: true, active: true, demo: true },
];

const INITIAL_DEALS = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    business_id: '10000000-0000-4000-8000-000000000001',
    college_id: null,
    title: 'Study Grounds',
    offer: '15% off your next coffee',
    description: 'Show your student ID in store',
    category: 'Food',
    terms: 'One redemption per student.',
    starts_at: '2025-01-01T00:00:00.000Z',
    expires_at: '2027-12-31T23:59:59.000Z',
    status: 'active',
    demo: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    business_id: '10000000-0000-4000-8000-000000000002',
    college_id: null,
    title: 'Paper & Pine',
    offer: 'Buy 2 notebooks, get 1 free',
    description: 'In-store · Student ID required',
    category: 'Stationery',
    terms: 'One redemption per student.',
    starts_at: '2025-01-01T00:00:00.000Z',
    expires_at: '2027-12-31T23:59:59.000Z',
    status: 'active',
    demo: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd1000000-0000-4000-8000-000000000003',
    business_id: '10000000-0000-4000-8000-000000000003',
    college_id: null,
    title: 'Bytewise',
    offer: '₹2,500 off accessories',
    description: 'Use your student offer at checkout',
    category: 'Technology',
    terms: 'Valid on accessories over ₹5,000.',
    starts_at: '2025-01-01T00:00:00.000Z',
    expires_at: '2027-12-31T23:59:59.000Z',
    status: 'active',
    demo: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd1000000-0000-4000-8000-000000000004',
    business_id: '10000000-0000-4000-8000-000000000004',
    college_id: null,
    title: 'Campus Cycle Co.',
    offer: 'Free safety check with any tune-up',
    description: 'One redemption per student',
    category: 'Transport',
    terms: 'Appointment required.',
    starts_at: '2025-01-01T00:00:00.000Z',
    expires_at: '2027-12-31T23:59:59.000Z',
    status: 'active',
    demo: false,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_PROFILES = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    display_name: 'Campus Administrator',
    email: 'admin@campusloop.app',
    role: 'admin',
    college_id: '30000000-0000-4000-8000-000000000001',
    verification_status: 'approved',
    public_id: '11111111-1111-4111-8111-111111111111',
    verified_until: '2028-01-01T00:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    display_name: 'Emma Chen',
    email: 'emma@student.stanford.edu',
    role: 'student',
    college_id: '30000000-0000-4000-8000-000000000001',
    verification_status: 'approved',
    public_id: '22222222-2222-4222-8222-222222222222',
    verified_until: '2027-10-15T00:00:00.000Z',
    created_at: '2025-02-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    display_name: 'Marcus Reed',
    email: 'marcus@student.stanford.edu',
    role: 'student',
    college_id: '30000000-0000-4000-8000-000000000001',
    verification_status: 'approved',
    public_id: '33333333-3333-4333-8333-333333333333',
    verified_until: '2027-11-20T00:00:00.000Z',
    created_at: '2025-02-10T00:00:00.000Z',
  },
];

const INITIAL_LISTINGS = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    seller_id: '00000000-0000-4000-8000-000000000002',
    demo_seller_name: 'Emma Chen',
    college_id: '30000000-0000-4000-8000-000000000001',
    title: 'Campbell Biology, 12th Edition',
    description: 'A helpful textbook in like-new condition, no highlights, ready for its next reader.',
    category: 'Books',
    listing_type: 'sale',
    price: 3150,
    price_unit: 'total',
    condition: 'like_new',
    pickup_area: 'Main Quad',
    available_from: null,
    available_until: null,
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=720&q=82'],
    demo: false,
    created_at: '2026-09-01T10:00:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    seller_id: '00000000-0000-4000-8000-000000000003',
    demo_seller_name: 'Marcus Reed',
    college_id: '30000000-0000-4000-8000-000000000001',
    title: 'TI-84 Plus CE Graphing Calculator',
    description: 'Color screen, battery holds full charge, includes charging cable and cover.',
    category: 'Electronics',
    listing_type: 'sale',
    price: 4300,
    price_unit: 'total',
    condition: 'good',
    pickup_area: 'Engineering Quad',
    available_from: null,
    available_until: null,
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=720&q=82'],
    demo: false,
    created_at: '2026-09-05T12:30:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    seller_id: null,
    demo_seller_name: 'Jamie Park',
    college_id: '30000000-0000-4000-8000-000000000002',
    title: 'Trek FX 1 Hybrid Bike',
    description: 'Lightweight campus commuter bike with 21 gears, lock and helmet included.',
    category: 'Bikes',
    listing_type: 'rent',
    price: 750,
    price_unit: 'day',
    condition: 'good',
    pickup_area: 'Barrows Hall',
    available_from: '2026-09-01',
    available_until: '2026-12-20',
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=720&q=82'],
    demo: true,
    created_at: '2026-09-10T14:15:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    seller_id: '00000000-0000-4000-8000-000000000002',
    demo_seller_name: 'Emma Chen',
    college_id: '30000000-0000-4000-8000-000000000001',
    title: 'MacBook Air M2 · 13 inch · 256GB',
    description: 'Space Gray, 16GB RAM, battery health 96%. Includes original MagSafe charger and sleeve.',
    category: 'Electronics',
    listing_type: 'sale',
    price: 51500,
    price_unit: 'total',
    condition: 'like_new',
    pickup_area: 'Main Library',
    available_from: null,
    available_until: null,
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=720&q=82'],
    demo: false,
    created_at: '2026-09-12T09:00:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    seller_id: null,
    demo_seller_name: 'Priya Shah',
    college_id: '30000000-0000-4000-8000-000000000002',
    title: 'Organic Chemistry Molecular Model Kit',
    description: 'Complete 240-piece set for Chem 3A/3B. Free to borrow for midterm study weeks.',
    category: 'Books',
    listing_type: 'lend',
    price: 0,
    price_unit: 'total',
    condition: 'good',
    pickup_area: 'Latimer Hall',
    available_from: '2026-09-15',
    available_until: '2026-11-30',
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=720&q=82'],
    demo: true,
    created_at: '2026-09-15T16:45:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    seller_id: null,
    demo_seller_name: 'Sofia Rivera',
    college_id: '30000000-0000-4000-8000-000000000001',
    title: 'White cotton lab coat · size M',
    description: '100% cotton, knee length, meets chemistry lab requirements. Washed and sanitized.',
    category: 'Clothing',
    listing_type: 'sale',
    price: 1500,
    price_unit: 'total',
    condition: 'good',
    pickup_area: 'Science Quad',
    available_from: null,
    available_until: null,
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=720&q=82'],
    demo: true,
    created_at: '2026-09-18T11:20:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000007',
    seller_id: null,
    demo_seller_name: 'Noah Patel',
    college_id: '30000000-0000-4000-8000-000000000001',
    title: 'Mini rice cooker, perfect for dorms',
    description: 'Compact 3-cup capacity, non-stick pot, great for grains, soups and quick dorm dinners.',
    category: 'Dorm & home',
    listing_type: 'rent',
    price: 330,
    price_unit: 'day',
    condition: 'good',
    pickup_area: 'Graduate housing',
    available_from: '2026-09-20',
    available_until: '2026-12-15',
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=720&q=82'],
    demo: true,
    created_at: '2026-09-20T17:10:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000008',
    seller_id: null,
    demo_seller_name: 'Avery Johnson',
    college_id: '30000000-0000-4000-8000-000000000002',
    title: 'The Design of Everyday Things — Don Norman',
    description: 'Revised and expanded edition. Clean pages, no dog-ears, essential for UX and design courses.',
    category: 'Books',
    listing_type: 'sale',
    price: 1150,
    price_unit: 'total',
    condition: 'like_new',
    pickup_area: 'Wurster Hall',
    available_from: null,
    available_until: null,
    status: 'active',
    image_paths: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=720&q=82'],
    demo: true,
    created_at: '2026-09-22T13:00:00.000Z',
  },
];

class ResilientStore {
  constructor() {
    this.filePath = path.join(config.dataDir, 'db.json');
    this.data = {
      colleges: [...INITIAL_COLLEGES],
      businesses: [...INITIAL_BUSINESSES],
      deals: [...INITIAL_DEALS],
      profiles: [...INITIAL_PROFILES],
      listings: [...INITIAL_LISTINGS],
      college_requests: [],
      favorites: [{ user_id: '00000000-0000-4000-8000-000000000002', listing_id: '20000000-0000-4000-8000-000000000002' }],
      item_requests: [],
      transactions: [],
      verification_submissions: [],
      redemptions: [],
      listing_reports: [],
    };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(config.dataDir)) {
        fs.mkdirSync(config.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('[Store] Could not read db.json, using defaults:', err.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to save db.json:', err.message);
    }
  }

  hash(str) {
    return crypto.createHash('sha256').update(String(str).trim().toUpperCase()).digest('hex');
  }

  // Colleges
  async getColleges() {
    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      const { data, error } = await supabase.from('colleges').select('*').eq('active', true).order('name');
      if (!error && data?.length) return data;
    }
    return this.data.colleges.filter(c => c.active).sort((a, b) => a.name.localeCompare(b.name));
  }

  async addCollege(record) {
    const newCollege = {
      id: crypto.randomUUID(),
      name: record.name.trim(),
      city: record.city.trim(),
      region: record.region.trim(),
      country: (record.country || 'US').trim().toUpperCase(),
      active: true,
      created_at: new Date().toISOString(),
    };
    const health = await checkSupabaseHealth();
    if (health.schemaReady && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('colleges').insert(newCollege).select('*').single();
      if (!error && data) return data;
    }
    this.data.colleges.push(newCollege);
    this.save();
    return newCollege;
  }

  async toggleCollegeActive(id) {
    const college = this.data.colleges.find(c => c.id === id);
    if (!college) throw new Error('College not found.');
    college.active = !college.active;
    const health = await checkSupabaseHealth();
    if (health.schemaReady && supabaseAdmin) {
      await supabaseAdmin.from('colleges').update({ active: college.active }).eq('id', id);
    }
    this.save();
    return college;
  }

  // College Requests
  async addCollegeRequest(userId, record) {
    const reqItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      college_name: record.collegeName.trim(),
      city: record.city.trim(),
      region: record.region.trim(),
      contact_email: record.contactEmail || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      const { error } = await supabase.from('college_requests').insert(reqItem);
      if (!error) return reqItem;
    }
    this.data.college_requests.push(reqItem);
    this.save();
    return reqItem;
  }

  // Profiles
  async getProfile(userId) {
    if (!userId) return null;
    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      const { data, error } = await supabase.from('profiles')
        .select('id,display_name,role,college_id,verification_status,public_id,verified_until,created_at,colleges(name)')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) {
        return { ...data, college_name: data.colleges?.name ?? null };
      }
    }
    let profile = this.data.profiles.find(p => p.id === userId);
    if (!profile) {
      // Create a default student profile for any new user
      profile = {
        id: userId,
        display_name: 'Campus Student',
        role: 'student',
        college_id: '30000000-0000-4000-8000-000000000001',
        verification_status: 'unverified',
        public_id: crypto.randomUUID(),
        verified_until: null,
        created_at: new Date().toISOString(),
      };
      this.data.profiles.push(profile);
      this.save();
    }
    const college = this.data.colleges.find(c => c.id === profile.college_id);
    return { ...profile, college_name: college?.name ?? null };
  }

  async updateProfile(userId, updates) {
    let profile = await this.getProfile(userId);
    profile = { ...profile, ...updates, updated_at: new Date().toISOString() };
    const idx = this.data.profiles.findIndex(p => p.id === userId);
    if (idx >= 0) this.data.profiles[idx] = profile;
    else this.data.profiles.push(profile);

    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      await supabase.from('profiles').update(updates).eq('id', userId);
    }
    this.save();
    const college = this.data.colleges.find(c => c.id === profile.college_id);
    return { ...profile, college_name: college?.name ?? null };
  }

  // Listings
  async getListings({ userId, collegeId, category, listingType, condition, minPrice, maxPrice, search, sort } = {}) {
    let list = [...this.data.listings];

    // Filter active listings unless requested by owner or admin
    list = list.filter(l => l.status === 'active' || (userId && l.seller_id === userId));

    if (collegeId) {
      list = list.filter(l => l.college_id === collegeId);
    }
    if (category && category !== 'All items') {
      const matchCat = category === 'Bikes & transport' ? 'Bikes' : category;
      list = list.filter(l => l.category === matchCat);
    }
    if (listingType && listingType !== 'All listings') {
      const code = ({ 'For sale': 'sale', 'For rent': 'rent', 'Free lending': 'lend' })[listingType] || listingType;
      list = list.filter(l => l.listing_type === code);
    }
    if (condition && condition !== 'Any condition') {
      const condCode = ({ 'Like new': 'like_new', Good: 'good', 'Well loved': 'well_loved' })[condition] || condition;
      list = list.filter(l => l.condition === condCode);
    }
    if (minPrice !== undefined && minPrice !== '') {
      list = list.filter(l => l.price >= Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      list = list.filter(l => l.price <= Number(maxPrice));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        (l.pickup_area && l.pickup_area.toLowerCase().includes(q))
      );
    }

    if (sort === 'Price: low to high') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'Price: high to low') {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const listingTypeLabels = { sale: 'For sale', rent: 'For rent', lend: 'Free lending' };
    const conditionLabels = { like_new: 'Like new', good: 'Good', well_loved: 'Well loved' };

    return list.map(l => {
      const college = this.data.colleges.find(c => c.id === l.college_id);
      const seller = this.data.profiles.find(p => p.id === l.seller_id);
      const sellerName = seller?.display_name || l.demo_seller_name || 'Campus student';
      const initials = sellerName.split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'CL';
      const isVerified = seller?.verification_status === 'approved' &&
        seller.verified_until && new Date(seller.verified_until).getTime() > Date.now();

      return {
        ...l,
        name: l.title,
        type: listingTypeLabels[l.listing_type] || l.listing_type,
        condition: conditionLabels[l.condition] || l.condition,
        unit: l.price_unit === 'total' ? '' : `/${l.price_unit}`,
        college: college?.name || 'Campus community',
        seller: sellerName,
        initials,
        sellerVerified: isVerified,
        imageUrl: l.image_paths?.[0] || '',
        image: l.image_paths?.[0] || '',
      };
    });
  }

  async createListing(userId, values, imagePath) {
    const listingType = values.listingType === 'For rent' ? 'rent' : values.listingType === 'Free lending' ? 'lend' : (values.listingType || 'sale');
    const condition = ({ 'Like new': 'like_new', Good: 'good', 'Well loved': 'well_loved' })[values.condition] || values.condition || 'good';

    const newListing = {
      id: crypto.randomUUID(),
      seller_id: userId,
      demo_seller_name: null,
      college_id: values.collegeId,
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      listing_type: listingType,
      price: listingType === 'lend' ? 0 : Number(values.price || 0),
      price_unit: listingType === 'rent' ? (values.priceUnit || 'day') : 'total',
      condition,
      pickup_area: values.pickupArea.trim(),
      available_from: values.availableFrom || null,
      available_until: values.availableUntil || null,
      status: 'active',
      image_paths: imagePath ? [imagePath] : [],
      demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      const { data, error } = await supabase.from('listings').insert(newListing).select('*').single();
      if (!error && data) return data;
    }

    this.data.listings.unshift(newListing);
    this.save();
    return newListing;
  }

  async updateListingStatus(id, status) {
    const listing = this.data.listings.find(l => l.id === id);
    if (!listing) throw new Error('Listing not found.');
    listing.status = status;
    listing.updated_at = new Date().toISOString();
    const health = await checkSupabaseHealth();
    if (health.schemaReady && supabaseAdmin) {
      await supabaseAdmin.from('listings').update({ status }).eq('id', id);
    }
    this.save();
    return listing;
  }

  // Favorites
  async getFavorites(userId) {
    if (!userId) return [];
    return this.data.favorites.filter(f => f.user_id === userId).map(f => f.listing_id);
  }

  async toggleFavorite(userId, listingId, isSaved) {
    if (isSaved) {
      this.data.favorites = this.data.favorites.filter(f => !(f.user_id === userId && f.listing_id === listingId));
    } else {
      if (!this.data.favorites.some(f => f.user_id === userId && f.listing_id === listingId)) {
        this.data.favorites.push({ user_id: userId, listing_id: listingId, created_at: new Date().toISOString() });
      }
    }
    this.save();
    return !isSaved;
  }

  // Item Requests & Transactions
  async createItemRequest(userId, listingId, message, requestedFrom, requestedUntil) {
    const listing = this.data.listings.find(l => l.id === listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.demo || !listing.seller_id) throw new Error('Demo listings cannot receive real requests.');
    if (listing.seller_id === userId) throw new Error('You cannot request your own listing.');

    const newReq = {
      id: crypto.randomUUID(),
      listing_id: listingId,
      requester_id: userId,
      seller_id: listing.seller_id,
      message: message.trim(),
      status: 'pending',
      requested_from: requestedFrom || null,
      requested_until: requestedUntil || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      const { data, error } = await supabase.from('item_requests').insert(newReq).select('*').single();
      if (!error && data) return data;
    }

    this.data.item_requests.unshift(newReq);
    this.save();
    return newReq;
  }

  async transitionItemRequest(requestId, actorId, action, returnBy = null) {
    const reqItem = this.data.item_requests.find(r => r.id === requestId);
    if (!reqItem) throw new Error('Request not found.');

    const listing = this.data.listings.find(l => l.id === reqItem.listing_id);
    if (!listing) throw new Error('Associated listing not found.');

    if (['accept', 'reject'].includes(action)) {
      if (reqItem.seller_id !== actorId) throw new Error('Only the listing owner can respond to this request.');
      if (reqItem.status !== 'pending') throw new Error('This request has already been answered.');

      if (action === 'reject') {
        reqItem.status = 'rejected';
        reqItem.updated_at = new Date().toISOString();
        this.save();
        return { status: 'rejected' };
      }

      reqItem.status = 'accepted';
      reqItem.requested_until = returnBy || reqItem.requested_until;
      reqItem.updated_at = new Date().toISOString();

      listing.status = 'reserved';
      listing.updated_at = new Date().toISOString();

      const transaction = {
        id: crypto.randomUUID(),
        request_id: reqItem.id,
        listing_id: listing.id,
        buyer_id: reqItem.requester_id,
        seller_id: reqItem.seller_id,
        amount: listing.price,
        status: 'reserved',
        return_by: returnBy || reqItem.requested_until,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data.transactions.unshift(transaction);
      this.save();
      return { status: 'accepted', transaction_id: transaction.id, return_by: transaction.return_by };
    }

    let transaction = this.data.transactions.find(t => t.request_id === requestId);
    if (!transaction) throw new Error('Associated transaction record not found.');
    if (actorId !== transaction.seller_id && actorId !== transaction.buyer_id) {
      throw new Error('Only transaction participants can update this request.');
    }

    if (action === 'complete') {
      if (transaction.status !== 'reserved') throw new Error('This transaction is no longer reserved.');
      transaction.status = 'completed';
      transaction.updated_at = new Date().toISOString();
      reqItem.status = 'completed';
      reqItem.updated_at = new Date().toISOString();
      if (listing.listing_type === 'sale') {
        listing.status = 'sold';
      }
      listing.updated_at = new Date().toISOString();
      this.save();
      return { status: 'completed' };
    }

    if (action === 'return') {
      if (transaction.status !== 'completed') throw new Error('Only completed rentals and lending can be returned.');
      if (listing.listing_type === 'sale') throw new Error('A sale cannot be marked as returned.');
      transaction.status = 'returned';
      transaction.updated_at = new Date().toISOString();
      reqItem.status = 'returned';
      reqItem.updated_at = new Date().toISOString();
      listing.status = 'active';
      listing.updated_at = new Date().toISOString();
      this.save();
      return { status: 'returned' };
    }

    throw new Error('Unsupported action.');
  }

  async getActivity(userId, type) {
    if (!userId) return [];

    if (type === 'My listings') {
      return this.data.listings
        .filter(l => l.seller_id === userId && !l.demo)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (type === 'Incoming requests' || type === 'My requests') {
      const field = type === 'Incoming requests' ? 'seller_id' : 'requester_id';
      const requests = this.data.item_requests.filter(r => r[field] === userId);
      return requests.map(r => {
        const listing = this.data.listings.find(l => l.id === r.listing_id);
        const otherPartyId = type === 'Incoming requests' ? r.requester_id : r.seller_id;
        const otherParty = this.data.profiles.find(p => p.id === otherPartyId);
        return {
          ...r,
          listings: listing ? {
            ...listing,
            image_paths: listing.image_paths || [],
          } : null,
          other_party: otherParty ? {
            id: otherParty.id,
            display_name: otherParty.display_name,
            verification_status: otherParty.verification_status,
          } : null,
        };
      });
    }

    if (type === 'Transactions' || type === 'Borrowed & rented') {
      let txs = this.data.transactions.filter(t => t.buyer_id === userId || t.seller_id === userId);
      txs = txs.map(t => {
        const listing = this.data.listings.find(l => l.id === t.listing_id);
        return {
          ...t,
          listings: listing ? {
            ...listing,
            image_paths: listing.image_paths || [],
          } : null,
        };
      });
      if (type === 'Borrowed & rented') {
        txs = txs.filter(t => ['rent', 'lend'].includes(t.listings?.listing_type));
      }
      return txs;
    }

    return [];
  }

  // Student Deals
  async getDeals({ collegeId } = {}) {
    const health = await checkSupabaseHealth();
    if (health.schemaReady) {
      let query = supabase.from('deals')
        .select('id,title,offer,description,category,terms,expires_at,demo,college_id,businesses(name,demo)')
        .eq('status', 'active');
      const { data, error } = await query;
      if (!error && data?.length) {
        const tones = { Food: 'peach', Stationery: 'mint', Technology: 'lavender', Transport: 'blue' };
        const marks = { Food: '☕', Stationery: '✳', Technology: '⌘', Transport: '↗' };
        return data.map(deal => ({
          ...deal,
          name: deal.businesses?.name ?? deal.title ?? 'Campus business',
          detail: deal.description || deal.terms,
          expires: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(deal.expires_at)),
          tone: tones[deal.category] ?? 'lavender',
          mark: marks[deal.category] ?? '✳',
          demo: deal.demo || deal.businesses?.demo,
        }));
      }
    }

    let deals = this.data.deals.filter(d => d.status === 'active');
    if (collegeId) {
      deals = deals.filter(d => !d.college_id || d.college_id === collegeId);
    }
    const tones = { Food: 'peach', Stationery: 'mint', Technology: 'lavender', Transport: 'blue' };
    const marks = { Food: '☕', Stationery: '✳', Technology: '⌘', Transport: '↗' };

    return deals.map(d => {
      const biz = this.data.businesses.find(b => b.id === d.business_id);
      return {
        ...d,
        name: biz?.name || d.title || 'Campus partner',
        detail: d.description || d.terms,
        expires: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d.expires_at)),
        tone: tones[d.category] || 'lavender',
        mark: marks[d.category] || '✳',
        demo: Boolean(d.demo || biz?.demo),
      };
    });
  }

  async addDeal(values) {
    const newDeal = {
      id: crypto.randomUUID(),
      business_id: values.businessId,
      college_id: values.collegeId || null,
      title: values.title.trim(),
      offer: values.offer.trim(),
      description: (values.description || '').trim(),
      category: values.category,
      terms: (values.terms || 'One redemption per student.').trim(),
      starts_at: new Date().toISOString(),
      expires_at: values.expiresAt,
      status: 'active',
      demo: false,
      created_at: new Date().toISOString(),
    };
    this.data.deals.push(newDeal);
    this.save();
    return newDeal;
  }

  async updateDealStatus(id, status) {
    const deal = this.data.deals.find(d => d.id === id);
    if (!deal) throw new Error('Deal not found.');
    deal.status = status;
    this.save();
    return deal;
  }

  // Deal Redemption
  async redeemDeal(userId, dealId) {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('User profile not found.');

    // Check verification status
    const isVerified = profile.verification_status === 'approved' &&
      profile.verified_until && new Date(profile.verified_until).getTime() > Date.now();
    if (!isVerified) {
      throw new Error('An active verified student ID is required to redeem an offer.');
    }

    const deal = this.data.deals.find(d => d.id === dealId);
    if (!deal || deal.status !== 'active') throw new Error('This offer is expired or no longer available.');

    const alreadyRedeemed = this.data.redemptions.some(r => r.deal_id === dealId && r.user_id === userId);
    if (alreadyRedeemed) throw new Error('You have already redeemed this offer.');

    const code = `LOOP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const codeHash = this.hash(code);

    const redemption = {
      id: crypto.randomUUID(),
      deal_id: dealId,
      user_id: userId,
      code_hash: codeHash,
      redeemed_at: new Date().toISOString(),
      validated_at: null,
      validated_by: null,
    };

    this.data.redemptions.push(redemption);
    this.save();
    return { code, redemptionId: redemption.id };
  }

  // Coupon Validation
  async validateCoupon(actorId, rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!/^LOOP-[A-Z0-9-]{8,32}$/.test(code)) {
      throw new Error('Enter a valid CampusLoop redemption code.');
    }

    const codeHash = this.hash(code);
    const redemption = this.data.redemptions.find(r => r.code_hash === codeHash);
    if (!redemption) {
      return { status: 'invalid', valid: false, message: 'Code not found in campus records.' };
    }

    if (redemption.validated_at) {
      return { status: 'already_used', valid: false, message: 'This single-use code has already been redeemed.' };
    }

    const deal = this.data.deals.find(d => d.id === redemption.deal_id);
    if (!deal || new Date(deal.expires_at).getTime() <= Date.now()) {
      return { status: 'expired', valid: false, message: 'This student deal has expired.' };
    }

    redemption.validated_at = new Date().toISOString();
    redemption.validated_by = actorId;
    this.save();

    return { status: 'valid', valid: true, offer: deal.title || deal.offer };
  }

  // Student Verification Submissions & Review
  async submitVerification(userId, values, documentPath) {
    const profile = await this.getProfile(userId);
    if (profile.verification_status === 'approved' && profile.verified_until && new Date(profile.verified_until).getTime() > Date.now()) {
      throw new Error('Your student status is already verified.');
    }

    const existingPending = this.data.verification_submissions.find(s => s.user_id === userId && s.status === 'pending');
    if (existingPending) {
      throw new Error('Your verification is already being reviewed.');
    }

    const submission = {
      id: crypto.randomUUID(),
      user_id: userId,
      college_id: values.collegeId,
      legal_name: values.legalName.trim(),
      enrollment_status: values.enrollmentStatus,
      document_path: documentPath,
      status: 'pending',
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
    };

    this.data.verification_submissions.unshift(submission);
    await this.updateProfile(userId, {
      college_id: values.collegeId,
      verification_status: 'pending',
      verified_until: null,
    });
    this.save();
    return submission;
  }

  async getAdminQueue() {
    const pending = this.data.verification_submissions.filter(s => s.status === 'pending');
    const enriched = pending.map(sub => {
      const profile = this.data.profiles.find(p => p.id === sub.user_id);
      const college = this.data.colleges.find(c => c.id === sub.college_id);
      return {
        ...sub,
        profiles: profile ? { display_name: profile.display_name, verification_status: profile.verification_status, public_id: profile.public_id } : null,
        colleges: college ? { name: college.name } : null,
        document_url: sub.document_path.startsWith('http') || sub.document_path.startsWith('/') ? sub.document_path : `/uploads/${path.basename(sub.document_path)}`,
        document_name: path.basename(sub.document_path),
      };
    });
    return { submissions: enriched };
  }

  async reviewVerification(adminId, submissionId, status, note = '') {
    if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid status.');
    if (status === 'rejected' && (!note || note.trim().length < 8)) {
      throw new Error('Add a clear review note of at least 8 characters before rejecting.');
    }

    const sub = this.data.verification_submissions.find(s => s.id === submissionId);
    if (!sub || sub.status !== 'pending') throw new Error('This submission is no longer pending review.');

    sub.status = status;
    sub.review_note = note?.trim() || null;
    sub.reviewed_by = adminId;
    sub.reviewed_at = new Date().toISOString();

    const isApprove = status === 'approved';
    const verifiedUntil = isApprove ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;

    await this.updateProfile(sub.user_id, {
      verification_status: status,
      verified_until: verifiedUntil,
      college_id: sub.college_id,
      display_name: sub.legal_name || undefined,
    });

    this.save();
    return { ok: true, status, reviewed_at: sub.reviewed_at };
  }

  // Public QR Status Check
  async verifyStudentId(publicId) {
    if (!publicId) return { status: 'invalid', valid: false };
    const profile = this.data.profiles.find(p => p.public_id === publicId);
    if (!profile) return { status: 'invalid', valid: false };

    const expired = profile.verification_status === 'approved' &&
      (!profile.verified_until || new Date(profile.verified_until).getTime() <= Date.now());
    const status = expired ? 'expired' : profile.verification_status;
    const valid = status === 'approved';
    const college = this.data.colleges.find(c => c.id === profile.college_id);

    return {
      status,
      valid,
      ...(valid ? {
        student_name: profile.display_name,
        college: college?.name || 'Campus community',
        valid_until: profile.verified_until,
      } : {}),
    };
  }

  // Reports
  async addListingReport(reporterId, listingId, reason) {
    const report = {
      id: crypto.randomUUID(),
      listing_id: listingId,
      reporter_id: reporterId,
      reason: reason.trim(),
      status: 'open',
      created_at: new Date().toISOString(),
    };
    this.data.listing_reports.unshift(report);
    this.save();
    return report;
  }

  async updateReportStatus(id, status) {
    const report = this.data.listing_reports.find(r => r.id === id);
    if (!report) throw new Error('Report not found.');
    report.status = status;
    this.save();
    return report;
  }

  // Admin Resource queries
  async getAdminResource(resource) {
    if (resource === 'Listings') {
      return this.data.listings.map(l => {
        const profile = this.data.profiles.find(p => p.id === l.seller_id);
        const college = this.data.colleges.find(c => c.id === l.college_id);
        return {
          ...l,
          profiles: { display_name: profile?.display_name || l.demo_seller_name || 'Student' },
          colleges: { name: college?.name || 'Campus' },
        };
      });
    }
    if (resource === 'Colleges') return this.data.colleges;
    if (resource === 'Deals') {
      return this.data.deals.map(d => {
        const biz = this.data.businesses.find(b => b.id === d.business_id);
        return { ...d, businesses: { name: biz?.name || 'Business' } };
      });
    }
    if (resource === 'Redemptions') {
      return this.data.redemptions.map(r => {
        const deal = this.data.deals.find(d => d.id === r.deal_id);
        const profile = this.data.profiles.find(p => p.id === r.user_id);
        return {
          ...r,
          deals: { title: deal?.title || 'Offer' },
          profiles: { display_name: profile?.display_name || 'Student' },
        };
      });
    }
    if (resource === 'Reports & activity') {
      return this.data.listing_reports.map(rep => {
        const listing = this.data.listings.find(l => l.id === rep.listing_id);
        const profile = this.data.profiles.find(p => p.id === rep.reporter_id);
        return {
          ...rep,
          listings: { title: listing?.title || 'Listing' },
          profiles: { display_name: profile?.display_name || 'Student' },
        };
      });
    }
    return [];
  }
}

export const store = new ResilientStore();
