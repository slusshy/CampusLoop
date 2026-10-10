import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  backendConfigured, supabase, createItemRequest, createListing, invokeFunction, latestVerification,
  loadActivity, loadAdminQueue, loadAdminResource, loadColleges, loadDeals, loadFavorites, loadListings,
  loadProfile, manageRequest, redeemDeal, reportListing, requestCollege as saveCollegeRequest,
  reviewVerification, selectCollege, submitVerification, toggleFavorite, uploadListingImage, validateCoupon,
  updateAdminResource, createAdminCollege, loadAdminBusinesses, createAdminDeal,
  verifyStudentId,
} from './lib/supabase.js';

const products = [
  { id: 1, name: 'Campbell Biology, 12th Edition', category: 'Books', price: 3150, original: 6800, type: 'For sale', condition: 'Like new', college: 'Stanford University', seller: 'Olivia Chen', initials: 'OC', color: 'book', image: 'photo-1532012197267-da84d127e765', saved: false },
  { id: 2, name: 'TI-84 Plus CE Graphing Calculator', category: 'Electronics', price: 4300, original: 9950, type: 'For sale', condition: 'Good', college: 'Stanford University', seller: 'Marcus Reed', initials: 'MR', color: 'calc', image: 'photo-1587145820266-a5951ee6f620', saved: true },
  { id: 3, name: 'Trek FX 1 Hybrid Bike', category: 'Bikes', price: 750, unit: '/day', original: 0, type: 'For rent', condition: 'Good', college: 'UC Berkeley', seller: 'Jamie Park', initials: 'JP', color: 'bike', image: 'photo-1485965120184-e220f721d03e', saved: false },
  { id: 4, name: 'MacBook Air M2 · 13 inch', category: 'Electronics', price: 51500, original: 83000, type: 'For sale', condition: 'Like new', college: 'Stanford University', seller: 'Daniel Kim', initials: 'DK', color: 'laptop', image: 'photo-1517336714731-489689fd1ca8', saved: false },
  { id: 5, name: 'Organic Chemistry Molecular Model Kit', category: 'Books', price: 0, original: 0, type: 'Free lending', condition: 'Good', college: 'UC Berkeley', seller: 'Priya Shah', initials: 'PS', color: 'lab', image: 'photo-1532094349884-543bc11b234d', saved: false },
  { id: 6, name: 'White cotton lab coat · size M', category: 'Clothing', price: 1500, original: 3500, type: 'For sale', condition: 'Good', college: 'Stanford University', seller: 'Sofia Rivera', initials: 'SR', color: 'coat', image: 'photo-1582719471384-894fbb16e074', saved: false },
  { id: 7, name: 'Mini rice cooker, perfect for dorms', category: 'Dorm & home', price: 330, unit: '/day', original: 0, type: 'For rent', condition: 'Good', college: 'Stanford University', seller: 'Noah Patel', initials: 'NP', color: 'dorm', image: 'photo-1585515320310-259814833e62', saved: false },
  { id: 8, name: 'The Design of Everyday Things', category: 'Books', price: 1150, original: 2650, type: 'For sale', condition: 'Like new', college: 'UC Berkeley', seller: 'Avery Johnson', initials: 'AJ', color: 'design', image: 'photo-1544947950-fa07a98d237f', saved: false },
];
const deals = [
  { name: 'Study Grounds', category: 'Food', offer: '15% off your next coffee', detail: 'Show your student ID in store', expires: 'Oct 31, 2026', mark: '☕', tone: 'peach', demo: true },
  { name: 'Paper & Pine', category: 'Stationery', offer: 'Buy 2 notebooks, get 1 free', detail: 'In-store · Student ID required', expires: 'Nov 12, 2026', mark: '✳', tone: 'mint', demo: true },
  { name: 'Bytewise', category: 'Technology', offer: '₹2,500 off accessories', detail: 'Use your student offer at checkout', expires: 'Nov 30, 2026', mark: '⌘', tone: 'lavender', demo: true },
  { name: 'Campus Cycle Co.', category: 'Transport', offer: 'Free safety check with any tune-up', detail: 'One redemption per student', expires: 'Oct 28, 2026', mark: '↗', tone: 'blue', demo: true },
];
const navItems = [
  { id: 'marketplace', label: 'Marketplace', icon: 'grid' },
  { id: 'activity', label: 'My activity', icon: 'activity' },
  { id: 'deals', label: 'Student deals', icon: 'tag' },
  { id: 'identity', label: 'Student ID', icon: 'id' },
];
const iconPaths = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1"/></>,
  id: <><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="11" r="2.1"/><path d="M5.5 16c.8-2 5.2-2 6 0m2.5-5h4m-4 3h4"/></>,
  heart: <path d="m20.8 8.6 0 .2c-.2 2.4-2.5 4.7-7.4 9.1a2 2 0 0 1-2.8 0C5.7 13.5 3.4 11.2 3.2 8.8a5 5 0 0 1 8.8-3.2 5 5 0 0 1 8.8 3Z"/>,
  search: <><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 4.5 4.5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  down: <path d="m7 10 5 5 5-5"/>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M20 16v4H4v-4"/></>,
  shieldCheck: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
};
function Icon({ name, size = 18, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] || iconPaths.grid}</svg>;
}

function formatRupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function productPhoto(product, width = 720) {
  if (!product) return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=720&q=82';
  const img = product.imageUrl || product.image || product.image_paths?.[0];
  if (!img) return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=720&q=82';
  if (/^https?:\/\//i.test(img) || img.startsWith('/')) return img;
  return `https://images.unsplash.com/${img}?auto=format&fit=crop&w=${width}&q=82`;
}

function Logo({ onClick }) {
  return <button className="logo" onClick={onClick} aria-label="CampusLoop home"><span className="logo-mark"><span></span><span></span><span></span><span></span></span><span>campus<span className="logo-loop">loop</span></span></button>;
}

function ProductCard({ product, onOpen, onSave, saved }) {
  const collegeName = product.college || 'Campus community';
  const collegeInitial = collegeName.split(' ')[0] || 'Campus';
  const collegeExtra = collegeName.includes('Berkeley') ? 'Berkeley' : '';
  return <article className="product-card" onClick={() => onOpen(product)} tabIndex="0" onKeyDown={e => e.key === 'Enter' && onOpen(product)}>
    <div className="product-photo"><img src={productPhoto(product)} alt="" loading="lazy" />
      <span className={`listing-tag ${product.type === 'For rent' ? 'rent' : product.type === 'Free lending' ? 'free' : ''}`}>{product.type}</span>
      <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remove saved item' : 'Save item'} onClick={e => { e.stopPropagation(); onSave(product.id); }}><Icon name="heart" size={17} /></button>
    </div>
    <div className="product-info"><div className="product-title-row"><h3>{product.name}</h3><span className="product-price">{product.price ? `${formatRupees(product.price)}${product.unit || ''}` : 'Free'}</span></div>
      <div className="product-meta"><span>{product.condition}</span><i>·</i><span>{product.category}</span></div>
      <div className="product-footer"><span className="college-label"><Icon name="pin" size={13} />{collegeInitial} {collegeExtra}</span><span className="seller-avatar">{product.initials || 'CL'}</span></div>
    </div>
  </article>;
}

function App() {
  const [screen, setScreen] = useState(() => new URLSearchParams(window.location.search).has('student') ? 'qr-result' : 'landing');
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionFilter, setConditionFilter] = useState('Any condition');
  const [availabilityFilter, setAvailabilityFilter] = useState('Any availability');
  const [dealsQuery, setDealsQuery] = useState('');
  const [category, setCategory] = useState('All items');
  const [listingType, setListingType] = useState('All listings');
  const [college, setCollege] = useState('All colleges');
  const [sort, setSort] = useState('Recommended');
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(backendConfigured ? [] : [2]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [backendReady, setBackendReady] = useState(!backendConfigured);
  const [backendBusy, setBackendBusy] = useState(false);
  const [listingRows, setListingRows] = useState(backendConfigured ? [] : products);
  const [dealRows, setDealRows] = useState(backendConfigured ? [] : deals);
  const [activityRows, setActivityRows] = useState([]);
  const [activityBusy, setActivityBusy] = useState(false);
  const [adminQueue, setAdminQueue] = useState([]);
  const [adminRows, setAdminRows] = useState([]);
  const [selectedVerificationId, setSelectedVerificationId] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminBusinesses, setAdminBusinesses] = useState([]);
  const [adminCollegeFormOpen, setAdminCollegeFormOpen] = useState(false);
  const [adminDealFormOpen, setAdminDealFormOpen] = useState(false);
  const [submittedVerification, setSubmittedVerification] = useState(null);
  const [verificationFile, setVerificationFile] = useState(null);
  const [listingFile, setListingFile] = useState(null);
  const [qrResultData, setQrResultData] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [dealMessage, setDealMessage] = useState('');
  const [redeemConfirm, setRedeemConfirm] = useState(false);
  const [requestStartDate, setRequestStartDate] = useState('');
  const [requestReturnDate, setRequestReturnDate] = useState('');
  const [requestMessage, setRequestMessage] = useState('Hi! I’m interested in this item. When would pickup work for you?');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponValidation, setCouponValidation] = useState(null);
  const [toast, setToast] = useState('');
  const [dealFilter, setDealFilter] = useState('All deals');
  const [dealSelected, setDealSelected] = useState(null);
  const [activityTab, setActivityTab] = useState('My listings');
  const [verification, setVerification] = useState('Not verified');
  const [verificationFeedback, setVerificationFeedback] = useState('The uploaded document did not clearly show current enrollment. Please submit a current class schedule, student portal screenshot or enrollment letter.');
  const [mobileNav, setMobileNav] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState('Sign up');
  const [showAuth, setShowAuth] = useState(false);
  const [showCollege, setShowCollege] = useState(false);
  const [showRequestCollege, setShowRequestCollege] = useState(false);
  const [signupOnboarding, setSignupOnboarding] = useState(false);
  const [listingTypeForm, setListingTypeForm] = useState('For sale');
  const [filterOpen, setFilterOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('Verifications');

  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2600); }
  function go(next) {
    setScreen(next); setSelected(null); setDealSelected(null); setMenuOpen(false); setMobileNav(false);
    if (next === 'qr-result') {
      const id = profile?.public_id ?? new URLSearchParams(window.location.search).get('student');
      if (id) window.history.replaceState({}, '', `/?student=${encodeURIComponent(id)}`);
    } else if (new URLSearchParams(window.location.search).has('student')) {
      window.history.replaceState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openListing(listing) {
    setRequestStartDate('');
    setRequestReturnDate('');
    setRequestMessage('Hi! I’m interested in this item. When would pickup work for you?');
    setSelected(listing);
  }
  async function refreshProfile(userId) {
    if (!userId) return;
    try {
      const result = await loadProfile(userId);
      if (result) {
        setProfile(result);
        const verificationLabels = { unverified: 'Not verified', pending: 'Pending review', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', revoked: 'Revoked' };
        const profileStatus = result.verification_status === 'approved' && result.verified_until && new Date(result.verified_until).getTime() <= Date.now()
          ? 'expired'
          : result.verification_status;
        if (profileStatus) setVerification(verificationLabels[profileStatus] ?? 'Not verified');
        if (result.college_name) setCollege(result.college_name);
        try {
          const submission = await latestVerification(userId);
          setSubmittedVerification(submission);
          if (submission?.review_note) setVerificationFeedback(submission.review_note);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.warn('Profile refresh:', error.message);
    }
  }

  function handleQuickDemoSignIn(role = 'student') {
    const demoUser = role === 'admin'
      ? { id: '00000000-0000-4000-8000-000000000001', email: 'admin@campusloop.app' }
      : { id: '00000000-0000-4000-8000-000000000002', email: 'emma@student.stanford.edu' };
    const demoSession = { user: demoUser, access_token: `demo-token-${role}` };
    setSession(demoSession);
    setShowAuth(false);
    void refreshProfile(demoUser.id);
    notify(`Signed in as ${role === 'admin' ? 'Campus Administrator' : 'Emma Chen (Student)'}.`);
  }
  useEffect(() => {
    if (!backendConfigured || !supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) notify(error.message);
      setSession(data?.session ?? null);
      if (data?.session?.user?.id) void refreshProfile(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === 'SIGNED_OUT') { setProfile(null); setSaved([]); setVerification('Not verified'); setSubmittedVerification(null); go('landing'); }
      if (event === 'PASSWORD_RECOVERY') { setAuthMode('Update password'); setShowAuth(true); }
      if (nextSession?.user?.id && ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        window.setTimeout(() => { if (mounted) void refreshProfile(nextSession.user.id); }, 0);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!backendConfigured) return undefined;
    let current = true;
    const timer = window.setTimeout(async () => {
      setBackendReady(false);
      try {
        const collegeId = college === 'All colleges'
          ? undefined
          : collegeOptions.find((option) => option.name === college)?.id;
        const [rows, offerRows] = await Promise.all([
          loadListings({
            userId: session?.user?.id,
            collegeId,
            category: category === 'All items' ? undefined : category === 'Bikes & transport' ? 'Bikes' : category,
            listingType: listingType === 'All listings' ? undefined : ({ 'For sale': 'sale', 'For rent': 'rent', 'Free lending': 'lend' })[listingType],
            condition: conditionFilter === 'Any condition' ? undefined : ({ 'Like new': 'like_new', Good: 'good', 'Well loved': 'well_loved' })[conditionFilter],
            minPrice, maxPrice, search: query, sort,
          }),
          loadDeals({ collegeId }),
        ]);
        if (!current) return;
        setListingRows(rows);
        setDealRows(offerRows);
        setBackendReady(true);
      } catch (error) {
        if (!current) return;
        setListingRows([]);
        setDealRows([]);
        setBackendReady(true);
        notify(`Could not load CampusLoop data: ${error.message}`);
      }
    }, query ? 250 : 0);
    return () => { current = false; window.clearTimeout(timer); };
  }, [session?.user?.id, profile?.college_id, college, collegeOptions, category, listingType, conditionFilter, minPrice, maxPrice, query, sort]);
  useEffect(() => {
    if (!backendConfigured || !supabase) return undefined;
    let current = true;
    loadColleges().then((rows) => {
      if (current) setCollegeOptions(rows);
    }).catch((error) => { if (current) notify(`Could not load colleges: ${error.message}`); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    if (!backendConfigured || !session?.user?.id) return undefined;
    let current = true;
    loadFavorites(session.user.id).then((ids) => { if (current) setSaved(ids); })
      .catch((error) => { if (current) notify(`Could not load saved items: ${error.message}`); });
    return () => { current = false; };
  }, [session?.user?.id]);
  useEffect(() => {
    if (screen !== 'qr-result' || !backendConfigured) return;
    const publicId = new URLSearchParams(window.location.search).get('student') ?? profile?.public_id;
    if (!publicId) { setQrResultData({ status: 'invalid', valid: false }); return; }
    let current = true;
    setQrResultData(null);
    setQrBusy(true);
    verifyStudentId(publicId).then((result) => { if (current) setQrResultData(result); })
      .catch((error) => { if (current) setQrResultData({ error: error.message }); })
      .finally(() => { if (current) setQrBusy(false); });
    return () => { current = false; };
  }, [screen, profile?.public_id]);
  useEffect(() => {
    if (!backendConfigured || !profile?.role || profile.role !== 'admin') return;
    if (screen === 'admin' && adminTab === 'Verifications') {
      loadAdminQueue().then((result) => {
        const submissions = result.submissions ?? [];
        setAdminQueue(submissions);
        setSelectedVerificationId(current => submissions.some(item => item.id === current) ? current : submissions[0]?.id ?? null);
      })
        .catch((error) => notify(`Could not load the review queue: ${error.message}`));
    } else if (screen === 'admin') {
      loadAdminResource(adminTab).then(setAdminRows)
        .catch((error) => notify(`Could not load admin records: ${error.message}`));
      if (adminTab === 'Deals') loadAdminBusinesses().then(setAdminBusinesses)
        .catch((error) => notify(`Could not load approved businesses: ${error.message}`));
    }
  }, [backendConfigured, profile?.role, screen, adminTab]);
  useEffect(() => {
    if (!backendConfigured || !session?.user?.id || screen !== 'activity') return;
    let current = true;
    setActivityRows([]);
    loadActivity(session.user.id, activityTab).then((rows) => { if (current) setActivityRows(rows); })
      .catch((error) => { if (current) notify(`Could not load activity: ${error.message}`); });
    return () => { current = false; };
  }, [backendConfigured, session?.user?.id, screen, activityTab]);
  async function toggleSave(id) {
    const isSaved = saved.includes(id);
    if (backendConfigured) {
      if (!session?.user?.id) { setAuthMode('Sign up'); setShowAuth(true); notify('Sign in to save campus listings.'); return; }
      try { await toggleFavorite(session.user.id, id, isSaved); }
      catch (error) { notify(`Could not update saved items: ${error.message}`); return; }
    }
    setSaved(previous => isSaved ? previous.filter(item => item !== id) : [...previous, id]);
  }
  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!backendConfigured || !supabase) {
      notify('Connect a Supabase project to create or sign in to a real account. Demo browsing is still available.');
      return;
    }
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    setBackendBusy(true);
    try {
      if (authMode === 'Forgot password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setAuthNotice('If there’s an account for that email, we’ll send a password reset link shortly.');
        setAuthMode('Email sent');
        return;
      }
      if (authMode === 'Update password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setAuthNotice('Your password has been updated. You can continue to your campus community.');
        setAuthMode('Password updated');
        return;
      }
      if (authMode === 'Sign up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: String(formData.get('displayName') ?? '').trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          await refreshProfile(data.user.id);
          setSignupOnboarding(true);
          setShowAuth(false);
          setShowCollege(true);
        } else {
          setAuthNotice('Confirm your email first. Then sign in to choose your campus and finish setting up your account.');
          setAuthMode('Signup confirmation');
        }
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      const nextProfile = await loadProfile(data.user.id);
      setProfile(nextProfile);
      if (!nextProfile.college_id) {
        setSignupOnboarding(true);
        setShowAuth(false);
        setShowCollege(true);
      } else {
        setShowAuth(false);
        go('marketplace');
        notify(`Welcome back, ${nextProfile.display_name}.`);
      }
    } catch (error) {
      notify(`Could not complete account action: ${error.message}`);
    } finally {
      setBackendBusy(false);
    }
  }
  async function handleSignOut() {
    if (!supabase) { setShowAuth(false); return; }
    const { error } = await supabase.auth.signOut();
    if (error) notify(`Could not sign out: ${error.message}`);
  }
  async function handleSelectCollege(collegeOption) {
    try {
      if (signupOnboarding && session?.user?.id && collegeOption.id) {
        const nextProfile = await selectCollege(session.user.id, collegeOption.id);
        setProfile(nextProfile);
        setCollege(nextProfile.college_name);
        setSignupOnboarding(false);
        setShowCollege(false);
        go('registration-success');
        return;
      }
      setCollege(collegeOption.name);
      setShowCollege(false);
    } catch (error) {
      notify(`Could not save your campus: ${error.message}`);
    }
  }
  async function handleListingSubmit(event) {
    event.preventDefault();
    const userId = session?.user?.id || profile?.id || '00000000-0000-4000-8000-000000000002';
    const form = event.currentTarget;
    const values = new FormData(form);
    setBackendBusy(true);
    let imagePath = null;
    try {
      imagePath = listingFile ? await uploadListingImage(userId, listingFile) : null;
      await createListing(userId, {
        collegeId: profile?.college_id || collegeOptions[0]?.id || '30000000-0000-4000-8000-000000000001',
        title: values.get('title'),
        description: values.get('description'),
        category: values.get('category'),
        listingType: listingTypeForm === 'For sale' ? 'sale' : listingTypeForm === 'For rent' ? 'rent' : 'lend',
        condition: ({ 'Like new': 'like_new', Good: 'good', 'Well loved': 'well_loved' })[values.get('condition')],
        pickupArea: values.get('pickupArea'),
        price: values.get('price'),
        priceUnit: values.get('priceUnit') || 'day',
        availableFrom: values.get('availableFrom'),
        availableUntil: values.get('availableUntil'),
      }, imagePath);
      setListingFile(null);
      notify('Your listing has been published.');
      setQuery('');
      try {
        const rows = await loadListings();
        setListingRows(rows);
      } catch (err) {
        console.warn('Reload listings:', err.message);
      }
      go('marketplace');
    } catch (error) {
      notify(`Could not publish listing: ${error.message}`);
    } finally {
      setBackendBusy(false);
    }
  }
  async function handleVerificationSubmit() {
    const userId = session?.user?.id || profile?.id || '00000000-0000-4000-8000-000000000002';
    const form = document.getElementById('verification-form');
    if (!form || !form.reportValidity()) return;
    const values = new FormData(form);
    setBackendBusy(true);
    try {
      await submitVerification(userId, {
        collegeId: values.get('collegeId') || profile?.college_id || collegeOptions[0]?.id || '30000000-0000-4000-8000-000000000001',
        legalName: values.get('legalName'),
        enrollmentStatus: values.get('enrollmentStatus'),
      }, verificationFile);
      setVerification('Pending review');
      setVerificationFile(null);
      await refreshProfile(userId);
      notify('Your documents were submitted. Student status is pending human review.');
    } catch (error) {
      notify(`Could not submit verification: ${error.message}`);
    } finally {
      setBackendBusy(false);
    }
  }
  async function handleItemRequest(listing) {
    const userId = session?.user?.id || profile?.id || '00000000-0000-4000-8000-000000000002';
    if (listing.seller_id === userId) { notify('You cannot request your own listing.'); return; }
    if (listing.type !== 'For sale' && (!requestStartDate || !requestReturnDate)) { notify('Choose the requested pickup and return dates before sending this request.'); return; }
    if (listing.type !== 'For sale' && listing.available_from && requestStartDate < listing.available_from) { notify('The requested pickup date is before this item becomes available.'); return; }
    if (listing.type !== 'For sale' && listing.available_until && requestReturnDate > listing.available_until) { notify('The requested return date is after this listing’s availability ends.'); return; }
    if (listing.type !== 'For sale' && requestReturnDate < requestStartDate) { notify('The return date must be on or after the requested pickup date.'); return; }
    if (listing.type === 'For rent' && requestReturnDate <= new Date().toISOString().slice(0,10)) { notify('Rental return dates must be in the future.'); return; }
    try {
      await createItemRequest(userId, listing, requestMessage, listing.type === 'For sale' ? null : requestStartDate, listing.type === 'For sale' ? null : requestReturnDate);
      setSelected(null);
      notify('Your request has been sent to the student.');
    } catch (error) { notify(`Could not send your request: ${error.message}`); }
  }

  async function handleReport(listing) {
    const userId = session?.user?.id || profile?.id || '00000000-0000-4000-8000-000000000002';
    const reason = window.prompt('What should our campus team review about this listing?', 'Please review this listing for a community guidelines concern.');
    if (!reason?.trim()) return;
    try {
      await reportListing(userId, listing.id, reason);
      notify('Thanks. Your report was sent to the CampusLoop review team.');
    } catch (error) {
      notify(`Could not send your report: ${error.message}`);
    }
  }
  async function handleDealRedemption(deal) {
    const userId = session?.user?.id || profile?.id || '00000000-0000-4000-8000-000000000002';
    setBackendBusy(true);
    try {
      const result = await redeemDeal(deal.id);
      setCouponResult({ code: result.code, demo: deal.demo });
      setDealMessage('');
      setRedeemConfirm(false);
      notify('Offer code issued. Present to business at checkout.');
    } catch (error) {
      const message = error.message.includes('already redeemed')
        ? 'This account has already redeemed this offer.'
        : error.message.includes('not available')
          ? 'This offer is expired or no longer available.'
          : error.message;
      setDealMessage(message);
      notify(`Could not redeem this offer: ${message}`);
    } finally {
      setBackendBusy(false);
    }
  }
  async function copyCouponCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      notify('One-time offer code copied.');
    } catch (error) {
      notify(`Could not copy the code: ${error.message}`);
    }
  }
  async function handleCouponValidation(event) {
    event.preventDefault();
    if (!couponCodeInput.trim()) {
      notify('Enter a student offer code.');
      return;
    }
    setBackendBusy(true);
    setCouponValidation(null);
    try {
      const result = await validateCoupon(couponCodeInput);
      setCouponValidation(result);
      if (result.valid) {
        setCouponCodeInput('');
        notify(`Success! ${result.offer || 'Offer validated'}`);
      }
    } catch (error) {
      setCouponValidation({ status: 'error', valid: false, message: error.message });
      notify(`Could not validate this code: ${error.message}`);
    } finally {
      setBackendBusy(false);
    }
  }
  async function handleVerificationReview(submissionId, status) {
    if (status === 'rejected' && adminReviewNote.trim().length < 8) {
      notify('Add a clear review note of at least 8 characters before rejecting this submission.');
      return;
    }
    setAdminBusy(true);
    try {
      await reviewVerification(submissionId, status, adminReviewNote);
      setAdminReviewNote('');
      const queue = await loadAdminQueue();
      setAdminQueue(queue.submissions ?? []);
      setSelectedVerificationId(queue.submissions?.[0]?.id ?? null);
      notify(status === 'approved' ? 'Student status approved.' : 'Submission rejected with your review note.');
    } catch (error) { notify(`Could not complete the review: ${error.message}`); }
    finally { setAdminBusy(false); }
  }
  async function handleAdminRecordAction(resource, row) {
    let changes;
    if (resource === 'Listings') changes = { status: row.status === 'active' ? 'removed' : 'active' };
    else if (resource === 'Colleges') changes = { active: !row.active };
    else if (resource === 'Deals') changes = { status: row.status === 'active' ? 'paused' : 'active' };
    else if (resource === 'Reports & activity') changes = { status: row.status === 'open' ? 'reviewed' : 'dismissed' };
    else if (resource === 'Redemptions') {
      const code=window.prompt('Enter the customer’s one-time CampusLoop code to validate it.');
      if (!code?.trim()) return;
      setAdminBusy(true);
      try {
        const result=await validateCoupon(code);
        if(result.valid)setAdminRows(await loadAdminResource(resource));
        notify(result.valid?`Code valid · ${result.offer}`:`Code not valid · ${result.status}`);
      } catch(error) { notify(`Could not validate coupon: ${error.message}`); }
      finally { setAdminBusy(false); }
      return;
    } else return;
    setAdminBusy(true);
    try {
      await updateAdminResource(resource,row.id,changes);
      const rows=await loadAdminResource(resource);
      setAdminRows(rows);
      if(resource==='Colleges')setCollegeOptions(await loadColleges());
      notify(`${resource==='Listings'?'Listing':resource==='Colleges'?'College':resource==='Deals'?'Deal':'Report'} updated.`);
    } catch(error) { notify(`Could not update ${resource.toLowerCase()}: ${error.message}`); }
    finally { setAdminBusy(false); }
  }
  async function handleAdminCollegeCreate(event) {
    event.preventDefault();
    const values=new FormData(event.currentTarget);
    setAdminBusy(true);
    try {
      await createAdminCollege({name:values.get('name'),city:values.get('city'),region:values.get('region'),country:values.get('country')});
      setCollegeOptions(await loadColleges());
      setAdminRows(await loadAdminResource('Colleges'));
      setAdminCollegeFormOpen(false);
      notify('College added to the campus directory.');
    } catch(error) { notify(`Could not add college: ${error.message}`); }
    finally { setAdminBusy(false); }
  }
  async function handleAdminDealCreate(event) {
    event.preventDefault();
    const values=new FormData(event.currentTarget);
    setAdminBusy(true);
    try {
      await createAdminDeal({businessId:values.get('businessId'),title:values.get('title'),offer:values.get('offer'),description:values.get('description'),category:values.get('category'),terms:values.get('terms'),expiresAt:new Date(`${values.get('expiresAt')}T23:59:59`).toISOString()});
      setAdminRows(await loadAdminResource('Deals'));
      setAdminDealFormOpen(false);
      notify('Offer published for the selected approved business.');
    } catch(error) { notify(`Could not create offer: ${error.message}`); }
    finally { setAdminBusy(false); }
  }
  async function handleActivityAction(row, action) {
    if (!session?.user?.id) {
      setAuthMode('Sign up');
      setShowAuth(true);
      notify('Sign in to manage your CampusLoop activity.');
      return;
    }
    let returnBy = row.requested_until ?? row.return_by ?? null;
    if (action === 'accept' && ['rent', 'lend'].includes(row.listings?.listing_type) && !returnBy) {
      returnBy = window.prompt('Enter the agreed return date (YYYY-MM-DD):');
      if (!returnBy) return;
    }
    if (returnBy && !/^\d{4}-\d{2}-\d{2}$/.test(returnBy)) {
      notify('Enter the return date in YYYY-MM-DD format.');
      return;
    }
    setActivityBusy(true);
    try {
      await manageRequest(row.id ?? row.request_id, action, returnBy);
      const rows = await loadActivity(session.user.id, activityTab);
      setActivityRows(rows);
      notify(action === 'accept' ? 'Request accepted and item reserved.' : action === 'reject' ? 'Request declined.' : action === 'return' ? 'Item marked as returned.' : 'Transaction marked as complete.');
    } catch (error) {
      notify(`Could not update this request: ${error.message}`);
    } finally {
      setActivityBusy(false);
    }
  }
  const filtered = useMemo(() => listingRows.filter(p => {
    const today = new Date().toISOString().slice(0, 10);
    const text = `${p.name} ${p.category} ${p.college} ${p.seller}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesCategory = category === 'All items' || (category === 'Bikes & transport' ? p.category === 'Bikes' : p.category === category);
    const matchesType = listingType === 'All listings' || p.type === listingType;
    const matchesCollege = college === 'All colleges' || p.college === college;
    const matchesMin = minPrice === '' || p.price >= Number(minPrice);
    const matchesMax = maxPrice === '' || p.price <= Number(maxPrice);
    const matchesCondition = conditionFilter === 'Any condition' || p.condition === conditionFilter;
    const matchesAvailability = availabilityFilter === 'Any availability' || (availabilityFilter === 'Available now'
      && (!p.available_from || p.available_from <= today)
      && (!p.available_until || p.available_until >= today));
    return matchesQuery && matchesCategory && matchesType && matchesCollege && matchesMin && matchesMax && matchesCondition && matchesAvailability;
  }).sort((a, b) => sort === 'Price: low to high' ? a.price - b.price : sort === 'Price: high to low' ? b.price - a.price : 0), [listingRows, query, category, listingType, college, sort, minPrice, maxPrice, conditionFilter, availabilityFilter]);

  function header() {
    return <header className="topbar"><div className="topbar-inner"><Logo onClick={() => go('marketplace')} />
      <div className="top-search"><Icon name="search" size={18}/><input aria-label="Search items and colleges" placeholder="Search textbooks, bikes, calculators..." value={query} onChange={e => { setQuery(e.target.value); if (screen !== 'marketplace') go('marketplace'); }} /><kbd>⌘ K</kbd></div>
      <div className="top-actions"><button className="college-switch" onClick={() => setShowCollege(true)}><Icon name="pin" size={16}/><span>{college === 'All colleges' ? 'All colleges' : college.replace(' University', '')}</span><Icon name="down" size={14}/></button><button className="icon-button notification" aria-label="Notifications" onClick={() => notify('You’re all caught up.') }><Icon name="bell"/><i></i></button><button className="profile-button" onClick={() => session ? setMenuOpen(!menuOpen) : (setAuthMode('Sign up'), setShowAuth(true))}><span className="profile-avatar">{profile?.display_name?.split(/\s+/).slice(0,2).map(name=>name[0]).join('').toUpperCase()||'EC'}</span><Icon name="down" size={14}/></button>
      {menuOpen && <div className="profile-menu"><div className="profile-menu-head"><strong>{profile?.display_name || 'Campus student'}</strong><small>{profile?.college_name || 'Choose your campus'}</small></div><button onClick={() => go('activity')}>My activity</button><button onClick={() => go('identity')}>Student ID</button><button onClick={handleSignOut}>Sign out</button></div>}</div>
    </div></header>;
  }
  function sidebar() {
    return <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}><div className="side-label">YOUR CAMPUS</div>
      {navItems.map(item => <button key={item.id} onClick={() => go(item.id)} className={`side-link ${screen === item.id ? 'active' : ''}`}><Icon name={item.icon}/><span>{item.label}</span></button>)}
      <div className="side-separator"></div><div className="side-label">YOUR SPACE</div>
      <button className={`side-link ${screen === 'saved' ? 'active' : ''}`} onClick={() => go('saved')}><Icon name="heart"/><span>Saved items</span><span className="nav-count">{saved.length}</span></button>
      <button className={`side-link ${screen === 'sell' ? 'active' : ''}`} onClick={() => go('sell')}><Icon name="plus"/><span>List an item</span></button>
      <div className="sidebar-card"><div className="verify-illustration"><Icon name="shieldCheck" size={21}/></div><strong>Your campus, your community.</strong><p>Verify your student status to build trust when you buy and sell.</p><button onClick={() => go('verification')}>Get verified <Icon name="chevron" size={15}/></button></div>
      {backendConfigured&&profile?.role==='business'&&<button className={`admin-link ${screen==='business'?'active':''}`} onClick={()=>go('business')}><span className="admin-pip"></span> Business code check <Icon name="arrow" size={14}/></button>}
      {(!backendConfigured || profile?.role === 'admin') && <button className="admin-link" onClick={() => go('admin')}><span className="admin-pip"></span> {backendConfigured?'Admin console':'Admin preview'} <Icon name="arrow" size={14}/></button>}
      <div className="side-bottom"><div className="help-icon">?</div><span>Need a hand?</span><button onClick={() => notify('CampusLoop support contact will be published before launch.')}>Get help <Icon name="arrow" size={13}/></button></div>
    </aside>;
  }
  function marketplace() {
    const categories = ['All items', 'Books', 'Electronics', 'Bikes & transport', 'Clothing', 'Dorm & home'];
    return <><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"></span> YOUR CAMPUS MARKETPLACE</div><h1>Good finds, <span>closer to home.</span></h1><p>A better way to get what you need—and pass along what you don’t.</p></div><button className="button button-primary list-cta" onClick={() => go('sell')}><Icon name="plus" size={17}/> List an item</button></div>
      <section className="market-feature"><div className="feature-copy"><span className="feature-kicker"><span className="feature-spark">✳</span> THE STUDENT-TO-STUDENT MARKETPLACE</span><h2>What goes around<br/>comes <em>around.</em></h2><p>Find good stuff from students on your campus. Give your old favorites a new home.</p><button onClick={() => document.getElementById('browse-items')?.scrollIntoView({ behavior: 'smooth' })}>Explore what’s here <Icon name="arrow" size={16}/></button><div className="feature-circles"><div><span className="mini-circ c1">EC</span><span className="mini-circ c2">JP</span><span className="mini-circ c3">MR</span></div><span>Good things are already in motion.</span></div></div><div className="feature-collage"><div className="collage-photo main"><img src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=700&q=85" alt="Open books waiting to be read" /></div><div className="collage-photo top"><img src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=420&q=85" alt="Laptop and study essentials" /></div><div className="collage-photo bottom"><img src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=360&q=85" alt="Student bicycle" /></div><div className="floating-note"><span className="note-icon"><Icon name="arrow" size={15}/></span><span><strong>One student’s extra</strong><small>is another’s just right.</small></span></div><div className="collage-stamp">PASS IT<br/>FORWARD <span>↗</span></div></div></section>
      <section className="browse-section" id="browse-items"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">MADE FOR CAMPUS LIFE</div><h2>Find your next <span>favorite.</span></h2></div><button className="text-button" onClick={() => { setCategory('All items'); setListingType('All listings'); setQuery(''); }}>View everything <Icon name="arrow" size={15}/></button></div>
        <div className="browse-controls"><div className="category-tabs">{categories.map((c, i) => <button key={c} className={`category-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{i === 0 && <span className="all-category-icon">✳</span>}{c}</button>)}</div><button className="filter-toggle" onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" size={16}/> Filters <span className="filter-dot"/></button></div>
        <div className={`filter-panel ${filterOpen ? 'visible' : ''}`}><label>Listing type<select value={listingType} onChange={e => setListingType(e.target.value)}><option>All listings</option><option>For sale</option><option>For rent</option><option>Free lending</option></select></label><label>Campus<select value={college} onChange={e => setCollege(e.target.value)}><option>All colleges</option>{(backendConfigured?collegeOptions.map(option=>option.name):['Stanford University','UC Berkeley']).map(name=><option key={name}>{name}</option>)}</select></label><label>Condition<select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}><option>Any condition</option><option>Like new</option><option>Good</option><option>Well loved</option></select></label><label>Availability<select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)}><option>Any availability</option><option>Available now</option></select></label><label>Min price (₹)<input type="number" min="0" placeholder="₹0" value={minPrice} onChange={e => setMinPrice(e.target.value)}/></label><label>Max price (₹)<input type="number" min="0" placeholder="No max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}/></label><label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Price: high to low</option></select></label><button className="clear-filters" onClick={() => { setListingType('All listings'); setCollege('All colleges'); setCategory('All items'); setMinPrice(''); setMaxPrice(''); setConditionFilter('Any condition'); setAvailabilityFilter('Any availability'); setSort('Recommended'); }}>Clear all</button></div>
        <div className="results-line"><span>{filtered.length ? <>A few good finds <span className="results-count">({filtered.length})</span></> : 'Nothing here just yet'}</span><button className="sort-mobile" onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" size={15}/> Filter & sort</button><span className="results-campus"><Icon name="pin" size={13}/>{college === 'All colleges' ? 'Showing all campuses' : college}</span></div>
        {!backendReady&&backendConfigured?<div className="empty-state" role="status"><span className="empty-icon"><Icon name="clock" size={23}/></span><h3>Loading campus listings…</h3><p>Finding items and offers for your selected filters.</p></div>:filtered.length ? <div className="product-grid">{filtered.map(p => <ProductCard key={p.id} product={p} saved={saved.includes(p.id)} onSave={toggleSave} onOpen={openListing}/>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="search" size={23}/></span><h3>{backendConfigured?'No listings match these filters':'No matches this time'}</h3><p>Try a different search, or clear a filter to see more from your campus.</p><button className="button button-outline" onClick={() => {setQuery('');setCategory('All items');setListingType('All listings');setCollege('All colleges');}}>Clear filters</button></div>}
        <section className="deals-strip"><div className="deal-strip-icon">✳</div><div className="deal-strip-copy"><span className="eyebrow muted-eyebrow">A LITTLE EXTRA FOR STUDENTS</span><h3>Good deals. <span>Better perks.</span></h3><p>See participating student offers and clearly marked demos.</p></div><button className="button button-outline" onClick={() => go('deals')}>Explore student deals <Icon name="arrow" size={15}/></button><div className="deals-mini-art"><span>✳</span><small>student<br/>offers</small><i>↗</i></div></section>
      </section>
      <div className="market-footer"><span>Made with care, for campus life.</span><span>Good finds deserve another go-around. <span className="footer-spark">✳</span></span></div>
    </>;
  }
  function activityPage() {
    const tabs = ['My listings', 'Incoming requests', 'My requests', 'Transactions', 'Borrowed & rented'];
    const titleFor = row => row.listings?.title ?? row.title ?? 'CampusLoop item';
    const listingFor = row => row.listings ?? row;
    const statusClass = status => ['accepted', 'completed', 'returned', 'active'].includes(status) ? 'available' : ['rejected', 'cancelled', 'removed'].includes(status) ? 'rejected' : 'pending';
    const isRequests = ['Incoming requests', 'My requests'].includes(activityTab);
    const isTransactions = ['Transactions', 'Borrowed & rented'].includes(activityTab);
    const hasData = backendConfigured && session?.user?.id;
    return <div className="page-content"><PageTitle eyebrow="YOUR CAMPUS, YOUR CORNER" title="My activity" subtitle="Keep track of the things you’re passing along—and the things coming your way." action={<button className="button button-primary" onClick={() => go('sell')}><Icon name="plus" size={16}/> List an item</button>}/><div className="activity-tabs">{tabs.map(t=><button className={activityTab===t?'active':''} onClick={()=>setActivityTab(t)} key={t}>{t}</button>)}</div>
      {!hasData?<div className="empty-state activity-empty"><span className="empty-icon"><Icon name="activity" size={23}/></span><h3>Sign in to see your activity</h3><p>Your listings, requests and return dates will appear here when you’re signed in.</p><button className="button button-primary" onClick={()=>{setAuthMode('Sign up');setShowAuth(true);}}>Sign in or create an account</button></div>:activityBusy?<div className="empty-state activity-empty" role="status"><h3>Updating your activity…</h3><p>Your latest request status is being loaded.</p></div>:activityRows.length===0?<div className="empty-state activity-empty"><span className="empty-icon"><Icon name={isRequests?'activity':'clock'} size={23}/></span><h3>You’re all caught up</h3><p>{activityTab==='My listings'?'Your published listings will appear here.':`When you have ${activityTab.toLowerCase()}, they’ll show up here.`}</p><button className="button button-outline" onClick={()=>go(activityTab==='My listings'?'sell':'marketplace')}>{activityTab==='My listings'?'List an item':'Explore the marketplace'}</button></div>:<div className="activity-table"><div className="table-head"><span>ITEM</span><span>{isRequests?'STUDENT':'DETAILS'}</span><span>STATUS</span><span>{isTransactions?'RETURN BY':'UPDATED'}</span><span>ACTION</span></div>{activityRows.map(row=>{const listing=listingFor(row);const status=String(row.status??'active');const name=titleFor(row);const imagePath=listing.image_paths?.[0];const imageSrc=imagePath?productPhoto({image:imagePath}):'';return <div className="table-row" key={row.id??row.request_id}><div className="table-product">{imageSrc?<img src={imageSrc} alt=""/>:<span className="activity-placeholder"><Icon name="grid" size={15}/></span>}<span><strong>{name}</strong><small>{listing.listing_type??listing.type??'Listing'}{listing.price_unit&&listing.price_unit!=='total'?` · ${formatRupees(listing.price)}/${listing.price_unit}`:''}</small></span></div><span className="activity-detail">{isRequests?(row.other_party?.display_name??'Campus student'):isTransactions?`${formatRupees(row.amount??listing.price??0)}`:new Date(row.created_at).toLocaleDateString()}</span><span className={`status-pill ${statusClass(status)}`}>{status.charAt(0).toUpperCase()+status.slice(1)}</span><span>{row.requested_until??row.return_by??(isTransactions?'No return date':new Date(row.created_at).toLocaleDateString())}</span><span className="activity-row-actions">{activityTab==='Incoming requests'&&status==='pending'&&<><button className="text-button" disabled={activityBusy} onClick={()=>void handleActivityAction(row,'accept')}>Accept</button><button className="text-button" disabled={activityBusy} onClick={()=>void handleActivityAction(row,'reject')}>Decline</button></>}{isTransactions&&status==='reserved'&&<button className="text-button" disabled={activityBusy} onClick={()=>void handleActivityAction(row,'complete')}>Mark complete</button>}{isTransactions&&status==='completed'&&['rent','lend'].includes(listing.listing_type)&&<button className="text-button" disabled={activityBusy} onClick={()=>void handleActivityAction(row,'return')}>Mark returned</button>}</span></div>;})}</div>}
      {hasData&&<div className="activity-note"><Icon name="clock" size={16}/><span><strong>Return dates to remember</strong> — Borrowed and rented items will appear here, with a friendly nudge before they’re due.</span><Icon name="chevron" size={16}/></div>}
    </div>;
  }
  function sellPage() {
    return <div className="page-content sell-page"><button className="back-link" onClick={()=>go('marketplace')}>← Back to marketplace</button><PageTitle eyebrow="PASS IT FORWARD" title="List an item" subtitle="Give something you’re done with a good next chapter."/><div className="form-layout"><form className="listing-form" onSubmit={handleListingSubmit}>
      <section className="form-card"><div className="form-section-head"><span className="form-step">01</span><div><h3>Show it off</h3><p>A clear photo helps the right person find your listing.</p></div></div><label className={`upload-box ${listingFile?'uploaded':''}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file&&(file.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))){notify('Choose a JPG, PNG or WebP image under 8 MB.');e.target.value='';setListingFile(null);return;}setListingFile(file??null);}}/>{listingFile?<><span className="upload-success"><Icon name="check"/></span><strong>{listingFile.name}</strong><small>Photo ready · choose to replace</small></>:<><span className="upload-icon"><Icon name="upload" size={20}/></span><strong>Choose a clear photo</strong><small>JPG, PNG or WebP · up to 8 MB</small></>}</label></section>
      <section className="form-card"><div className="form-section-head"><span className="form-step">02</span><div><h3>The essentials</h3><p>Help a fellow student know just what they’re getting.</p></div></div><label className="field-label">Listing title<input name="title" required minLength="4" maxLength="120" placeholder="e.g. Campbell Biology, 12th Edition"/></label><label className="field-label">Description<textarea name="description" required minLength="10" maxLength="4000" rows="3" placeholder="Share the details that make a difference..."/></label><div className="field-grid"><label className="field-label">Category<select name="category" required defaultValue=""><option value="" disabled>Choose a category</option>{['Books','Electronics','Bikes','Clothing','Dorm & home','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">Condition<select name="condition" required defaultValue=""><option value="" disabled>Choose condition</option>{['Like new','Good','Well loved'].map(x=><option key={x}>{x}</option>)}</select></label></div></section>
      <section className="form-card"><div className="form-section-head"><span className="form-step">03</span><div><h3>How will you pass it on?</h3><p>Pick the option that works best for you.</p></div></div><div className="listing-choice">{['For sale','For rent','Free lending'].map((type,i)=><button type="button" key={type} className={listingTypeForm===type?'selected':''} onClick={()=>setListingTypeForm(type)}><span className={`choice-icon choice-${i}`}>{i===0?'₹':i===1?<Icon name="clock" size={17}/>:'↗'}</span><span><strong>{type}</strong><small>{['Set a one-time price','Choose a rental rate','Share it, no charge'][i]}</small></span><span className="radio-mark"/></button>)}</div>{listingTypeForm!=='Free lending'&&<div className="field-grid"><label className="field-label">{listingTypeForm==='For rent'?'Rental price':'Asking price'}<div className="input-prefix"><span>₹</span><input name="price" type="number" required min="0.01" step="0.01" placeholder={listingTypeForm==='For rent'?'500':'2500'}/>{listingTypeForm==='For rent'&&<select name="priceUnit" aria-label="Rental price unit" defaultValue="day"><option value="day">per day</option><option value="week">per week</option><option value="semester">per semester</option></select>}</div></label>{listingTypeForm==='For rent'&&<div className="field-grid"><label className="field-label">Available from<input name="availableFrom" type="date"/></label><label className="field-label">Available until<input name="availableUntil" type="date"/></label></div>}</div>}</section>
      <section className="form-card"><div className="form-section-head"><span className="form-step">04</span><div><h3>Where to find it</h3><p>Your listing stays connected to the campus you selected for your account.</p></div></div><label className="field-label">College or university<input readOnly value={profile?.college_name??'Choose a campus in your profile'} aria-label="Selected college"/></label><label className="field-label">Pickup area<input name="pickupArea" required minLength="2" maxLength="120" placeholder="e.g. Main Quad or North Hall"/></label><p className="privacy-note"><Icon name="pin" size={15}/> Share a pickup area, not a private room or personal address.</p></section>
      <div className="form-actions"><button type="submit" className="button button-primary" disabled={backendBusy}>{backendBusy?'Publishing…':'Publish listing'} <Icon name="arrow" size={16}/></button></div>
      </form><aside className="form-aside"><div className="aside-tip"><span>✳</span><strong>A small tip</strong><p>Honest descriptions, fair prices and a clear photo make for really great exchanges.</p></div><div className="form-trust"><Icon name="shieldCheck" size={19}/><strong>CampusLoop keeps it local</strong><p>Your listing is only shown to students in your campus community.</p></div></aside></div></div>;
  }
  function verificationPage() {
    const statusClass = verification === 'Approved' ? 'approved' : verification === 'Pending review' ? 'pending' : verification === 'Rejected' ? 'rejected' : verification === 'Expired' ? 'expired' : 'unverified';
    const statusMessage = verification === 'Approved' ? 'You’re verified. Your campus community can see your status.' : verification === 'Pending review' ? 'Your information is with our team. We’ll be in touch once your documents are reviewed.' : verification === 'Rejected' ? 'We couldn’t verify this submission. Review the feedback and send an updated document.' : verification === 'Expired' ? 'Your student verification has expired. Submit current enrollment evidence to renew it.' : 'Not verified yet · It takes just a couple of minutes to get started.';
    return <div className="page-content identity-page">
      <PageTitle eyebrow="A SAFER WAY TO SHARE" title="Your campus, verified." subtitle="A little reassurance goes a long way. Verify your student status to build trust in your campus community."/>
      {!backendConfigured&&<div className="verification-preview-controls"><span>Preview a status:</span>{['Not verified','Pending review','Approved','Rejected','Expired'].map(status=><button key={status} className={verification===status?'active':''} onClick={()=>setVerification(status)}>{status}</button>)}</div>}
      <div className="verification-layout">
        <section className="verify-main">
          <div className="verification-status-card"><div className="verification-status-icon"><Icon name={verification==='Approved'?'shieldCheck':'shield'} size={25}/></div><div className="status-copy"><span className="status-overline">CURRENT STATUS</span><h3>{verification}</h3><p>{statusMessage}</p></div><span className={`status-pill ${statusClass}`}>{verification==='Approved'?'Verified':verification==='Pending review'?'In review':verification}</span></div>
          {verification === 'Approved' || verification === 'Pending review'
            ? <div className="verification-complete"><div className={`complete-mark ${verification==='Approved'?'green':''}`}><Icon name={verification==='Approved'?'check':'clock'} size={25}/></div><h3>{verification==='Approved'?'You’re part of the loop.':'You’re in good hands.'}</h3><p>{verification==='Approved'?'Your student status is confirmed. Your verified badge appears on your CampusLoop profile.':'Our team reviews submissions individually. We’ll email you when there’s news.'}</p>{submittedVerification?.created_at&&<small>Submitted {new Date(submittedVerification.created_at).toLocaleDateString()}</small>}{verification==='Approved'&&<button className="button button-primary" onClick={()=>go('identity')}>See your student ID <Icon name="arrow" size={15}/></button>}</div>
            : <div className="verification-form-card">
              {verification==='Rejected'&&<div className="review-feedback rejected"><strong>A note from our review team</strong><p>{verificationFeedback||submittedVerification?.review_note||'Please upload a document showing your current enrollment.'}</p></div>}
              {verification==='Expired'&&<div className="review-feedback expired"><strong>Time to renew</strong><p>Your student status is no longer current. Upload recent enrollment evidence for a new manual review.</p></div>}
              <form id="verification-form" onSubmit={e=>{e.preventDefault();void handleVerificationSubmit();}}>
                <div className="form-section-head"><span className="form-step">01</span><div><h3>{verification==='Expired'?'Confirm your enrollment':'Tell us about your school'}</h3><p>Use a personal email—no university email required.</p></div></div>
                <div className="field-grid"><label className="field-label">College or university<select name="collegeId" required defaultValue={profile?.college_id??''}><option value="" disabled>Select your college</option>{collegeOptions.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="field-label">Enrollment status<select name="enrollmentStatus" required defaultValue="currently_enrolled"><option value="currently_enrolled">Currently enrolled</option><option value="incoming_student">Incoming student</option><option value="recently_graduated">Recently graduated</option></select></label></div>
                <label className="field-label">Your name as it appears on your document<input name="legalName" required minLength="2" maxLength="120" defaultValue={profile?.display_name??''} placeholder="Your legal name"/></label>
                <div className="form-section-head verification-step-two"><span className="form-step">02</span><div><h3>A little proof</h3><p>Choose one document that shows your name and current enrollment.</p></div></div>
                <div className="evidence-options"><span>✓ Current class schedule</span><span>✓ Student portal screenshot</span><span>✓ Enrollment letter</span></div>
                <label className={`document-upload ${verificationFile?'uploaded':''}`}><input name="evidenceFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required={!verificationFile} onChange={e=>{const file=e.target.files?.[0];if(file&&(file.size>10*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))){notify('Choose a PDF, JPG, PNG or WebP document under 10 MB.');e.target.value='';setVerificationFile(null);return;}setVerificationFile(file??null);}}/><Icon name={verificationFile?'check':'upload'} size={19}/><span><strong>{verificationFile?verificationFile.name:'Choose a file to securely upload'}</strong><small>{verificationFile?'Attached privately for review.':'PDF, JPG, PNG or WebP · up to 10 MB'}</small></span><span className="button button-outline button-small">{verificationFile?'Change file':'Browse files'}</span></label>
                <p className="privacy-note"><Icon name="shieldCheck" size={15}/> Your documents are stored privately and only reviewed by our verification team.</p>
                <div className="warning-note"><strong>Submitting documents doesn’t automatically verify your student status.</strong> Our team reviews each submission before granting verified status.</div>
                <button className="button button-primary submit-verification" disabled={!verificationFile||backendBusy} type="submit">{backendBusy?'Submitting securely…':verification==='Expired'?'Submit renewal for review':'Submit for verification'} <Icon name="arrow" size={16}/></button>
              </form>
            </div>}
        </section>
        <aside className="verify-aside"><div className="why-verify-card"><div className="why-verify-icon"><Icon name="shieldCheck" size={21}/></div><h3>Made for students.<br/>Built on trust.</h3><p>Verification helps everyone know they’re sharing with someone who belongs in the campus community.</p><div className="why-list"><span><i>✓</i> More confidence when connecting</span><span><i>✓</i> A verified profile badge</span><span><i>✓</i> Your digital student ID</span></div></div><div className="private-note"><Icon name="shield" size={17}/><span><strong>Your info stays yours.</strong><br/>Private student documents are never shown to other users.</span></div></aside>
      </div>
    </div>;
  }
  function studentIdPage() {
    const studentName = profile?.display_name ?? 'Emma Chen';
    const campusName = profile?.college_name ?? (collegeOptions[0]?.name || 'Stanford University');
    const publicId = profile?.public_id || '22222222-2222-4222-8222-222222222222';
    const validThrough = profile?.verified_until ? new Date(profile.verified_until).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}) : 'October 15, 2027';
    const qrUrl = new URL(`/?student=${encodeURIComponent(publicId)}`,window.location.origin).toString();
    return <div className="page-content id-page"><PageTitle eyebrow="YOUR CAMPUS, ON THE GO" title="A little card. A lot of campus." subtitle="Your student status, always close by. Made for campus perks and real-world hellos." action={<button className="button button-outline" onClick={()=>window.print()}>↓ <span>Print student ID</span></button>}/>
    {verification==='Approved'?<div className="id-layout"><div className="student-id-card"><div className="id-card-top"><Logo onClick={()=>go('marketplace')}/><span className="id-verified"><Icon name="shieldCheck" size={14}/> VERIFIED STUDENT</span></div><div className="id-card-content"><div className="id-label">CAMPUSLOOP STUDENT ID</div><h2>{studentName}</h2><p>{campusName}</p><div className="id-details"><span>MEMBER SINCE<strong>{profile?.created_at?new Date(profile.created_at).toLocaleDateString(undefined,{month:'long',year:'numeric'}):'Member'}</strong></span><span>PUBLIC ID<strong>{publicId}</strong></span></div></div><div className="fake-qr"><QRCodeSVG value={qrUrl} size={78} level="M" title="Scan to check current CampusLoop student status"/></div><div className="id-card-foot"><span><i></i> VALID THROUGH {validThrough.toUpperCase()}</span><span>CAMPUSLOOP · STUDENT</span></div><div className="id-card-orb orb-one"></div><div className="id-card-orb orb-two"></div></div><div className="id-info-panel"><span className="id-info-badge"><Icon name="shieldCheck" size={17}/> STATUS CONFIRMED</span><h3>Hello, {studentName.split(' ')[0]}.<br/><span>You’re in.</span></h3><p>This is your CampusLoop student ID. Keep it handy when you’re exploring student deals or meeting another student on campus.</p><div className="id-info-row"><span>Student status</span><strong className="verified-text"><i/> Verified</strong></div><div className="id-info-row"><span>Your campus</span><strong>{campusName}</strong></div><div className="id-info-row"><span>Valid through</span><strong>{validThrough}</strong></div><button className="text-button id-how" onClick={()=>go('qr-result')}>Check student ID status <Icon name="arrow" size={14}/></button></div><div className="id-disclaimer"><Icon name="shield" size={16}/>QR resolves against current backend records; scan with any phone camera to verify student credentials.</div></div>:<div className="unverified-id"><div className="unverified-id-graphic"><Icon name="id" size={32}/></div><h2>Your campus ID is waiting.</h2><p>Verify your student status to unlock your digital ID, student deals and the verified badge on your profile.</p><button className="button button-primary" onClick={()=>go('verification')}>Verify my student status <Icon name="arrow" size={15}/></button><span>Personal email welcome. University email not required.</span></div>}</div>;
  }
  function dealsPage() {
    const dealCategories=['All deals','Food','Technology','Stationery','Transport'];
    const shown=dealRows.filter(d=>(dealFilter==='All deals'||d.category===dealFilter)&&(!dealsQuery||`${d.name} ${d.offer} ${d.category}`.toLowerCase().includes(dealsQuery.toLowerCase())));
    return <div className="page-content deals-page"><PageTitle eyebrow="A LITTLE EXTRA FOR STUDENTS" title="Good deals, just for you." subtitle="A few campus favorites have something special for students." action={<span className="demo-banner"><span/> {backendConfigured?'LIVE OFFERS':'DEMO OFFERS'}</span>}/><div className="deals-intro"><div className="deals-intro-copy"><span>MADE FOR YOUR EVERYDAY</span><h2>More campus.<br/><em>Less cost.</em></h2><p>Student-only offers from participating businesses. Demo offers are clearly labelled until partnerships are confirmed.</p></div><div className="deals-intro-art"><div className="coffee-cup">☕</div><div className="deal-ticket"><b>STUDENT<br/>PERK</b><span>✳</span></div><div className="art-spark a">✳</div><div className="art-spark b">✳</div></div></div><div className="deals-search"><Icon name="search" size={17}/><input aria-label="Search student offers" placeholder="Search businesses and offers..." value={dealsQuery} onChange={e=>setDealsQuery(e.target.value)}/>{dealsQuery&&<button onClick={()=>setDealsQuery('')} aria-label="Clear search"><Icon name="close" size={15}/></button>}</div><div className="deal-categories">{dealCategories.map(x=><button onClick={()=>setDealFilter(x)} className={dealFilter===x?'active':''} key={x}>{x}</button>)}</div>{shown.length?<div className="deals-grid">{shown.map((d,i)=><article className="deal-card" key={d.id??d.name}><div className={`deal-brand ${d.tone}`}><span>{d.mark}</span>{d.demo&&<span className="demo-tag">DEMO OFFER</span>}</div><div className="deal-card-body"><div className="deal-category-label">{d.category.toUpperCase()}</div><h3>{d.name}</h3><h4>{d.offer}</h4><p>{d.detail}</p><div className="deal-expiry"><Icon name="clock" size={14}/> Ends {d.expires}</div><button className="deal-claim" onClick={()=>{setCouponResult(null);setDealMessage('');setRedeemConfirm(false);setDealSelected(d);}}>{i===0?'See offer':'View offer'} <Icon name="arrow" size={15}/></button></div></article>)}</div>:<div className="empty-state"><span className="empty-icon"><Icon name="search" size={23}/></span><h3>{backendConfigured?'No current offers':'No offers found'}</h3><p>{backendConfigured?'There are no live student offers for this campus yet. Check back soon.':'Try another search or browse all demo student offers.'}</p>{!backendConfigured&&<button className="button button-outline" onClick={()=>{setDealsQuery('');setDealFilter('All deals');}}>Clear search</button>}</div>}<div className="deals-footnote"><Icon name="shieldCheck" size={17}/><p><strong>Offers are always optional.</strong> Sample businesses and offers are demo content for this preview; no real partnerships are implied.</p></div></div>;
  }
  function qrResult() {
    const status=backendConfigured?qrResultData?.status:(verification==='Approved'?'approved':'pending');
    const statusLabels={approved:'Valid student ID',pending:'Verification pending',expired:'Student ID expired',revoked:'Student ID revoked',unverified:'Student not verified',invalid:'Student ID not found'};
    const isValid=status==='approved'&&qrResultData?.valid!==false;
    return <div className="page-content qr-page"><button className="back-link" onClick={()=>go('identity')}>← Back to student ID</button><div className="qr-verify-panel"><div className="qr-check-art"><span><Icon name="shieldCheck" size={29}/></span><div className="qr-pulse"></div></div><span className="status-overline">CAMPUSLOOP ID CHECK</span><h1>{qrBusy?'Checking current status…':qrResultData?.error?'Status check unavailable':statusLabels[status]??'Student status unavailable'}</h1><p>{qrResultData?.error?qrResultData.error:isValid?'This student is currently verified with CampusLoop.':backendConfigured?'This student is not currently eligible to use a verified CampusLoop ID.':'Preview only. Live QR status checks require a connected backend.'}</p><div className={`result-status ${isValid?'good':'waiting'}`}><i/> {qrBusy?'CHECKING':isValid?'VALID · VERIFIED':(status??'unknown').replace('_',' ').toUpperCase()}</div>{isValid&&qrResultData?.student_name&&<div className="result-person"><div className="profile-avatar large">{qrResultData.student_name.split(/\s+/).slice(0,2).map(name=>name[0]).join('').toUpperCase()}</div><span><strong>{qrResultData.student_name}</strong><small>{qrResultData.college} · Valid until {qrResultData.valid_until?new Date(qrResultData.valid_until).toLocaleDateString():'—'}</small></span></div>}<span className="result-demo-note">{backendConfigured?'LIVE STATUS CHECK · Current server-side verification status':'DEMO PREVIEW · This screen is not proof of student status'}</span><button className="button button-outline" onClick={()=>go('identity')}>Back to student ID</button></div></div>;
  }
  function businessCouponPage() {
    if (backendConfigured&&!['business','admin'].includes(profile?.role)) return <div className="page-content"><div className="empty-state"><h1>Business access required</h1><p>Only an approved participating business or CampusLoop administrator can validate redemption codes.</p><button className="button button-outline" onClick={()=>go('marketplace')}>Return to CampusLoop</button></div></div>;
    const statusLabels={valid:'Code accepted',invalid:'Code not found',already_used:'Code already used',expired:'Offer expired',demo:'Demo codes cannot be accepted',error:'Could not validate code'};
    const resultClass=couponValidation?.valid?'approved':'rejected';
    return <div className="page-content business-coupon-page"><PageTitle eyebrow="PARTICIPATING BUSINESS" title="Validate a student offer." subtitle="Check a one-time CampusLoop code before applying the offer at checkout."/><section className="business-coupon-card"><div className="verification-status-icon"><Icon name="shieldCheck" size={25}/></div><h2>Coupon validation</h2><p>Codes are verified against current server records. A successful check marks the code as used.</p><form onSubmit={handleCouponValidation}><label className="field-label" htmlFor="coupon-code">Student’s redemption code</label><input id="coupon-code" name="code" value={couponCodeInput} onChange={e=>setCouponCodeInput(e.target.value.toUpperCase())} required minLength="13" maxLength="37" pattern="LOOP-[A-Z0-9-]{8,32}" placeholder="LOOP-XXXXXXXX" autoComplete="off"/><button className="button button-primary" disabled={backendBusy||!couponCodeInput.trim()}>{backendBusy?'Checking code…':'Validate code'}</button></form>{couponValidation&&<div className={`coupon-validation-result ${resultClass}`} role="status"><span>{couponValidation.valid?'✓':'!'}</span><div><strong>{statusLabels[couponValidation.status]??statusLabels.error}</strong><p>{couponValidation.offer?`Apply the offer: ${couponValidation.offer}`:couponValidation.message??'This code cannot be redeemed. Check the code or ask the student to open their CampusLoop ID.'}</p></div></div>}{!backendConfigured&&<div className="demo-note">Preview mode only. Code checks never succeed without a connected backend.</div>}</section></div>;
  }
  function adminManagementPage() {
    const config={
      Listings:{intro:'Review live student listings and remove content that violates community rules.',action:'Listings',columns:['LISTING','STUDENT','CAMPUS','STATUS']},
      Colleges:{intro:'Manage the active campus directory used for onboarding and marketplace filters.',action:'Colleges',columns:['COLLEGE','LOCATION','STATUS']},
      Deals:{intro:'Manage student offers from businesses with an approved CampusLoop partnership.',action:'Deals',columns:['BUSINESS','OFFER','EXPIRES','STATUS']},
      Redemptions:{intro:'Review coupon redemptions and validate a one-time code presented by a student.',action:'Redemptions',columns:['REDEMPTION','STUDENT','OFFER','STATUS']},
      'Reports & activity':{intro:'Review reports submitted by the student community.',action:'Reports',columns:['LISTING','REPORTED BY','REASON','STATUS']},
    };
    const view=config[adminTab];
    const tabs=['Verifications','Listings','Colleges','Deals','Redemptions','Reports & activity'];
    const collegeName=row=>Array.isArray(row.colleges)?row.colleges[0]?.name:row.colleges?.name;
    const displayRows=adminRows.map(row=>{
      if(adminTab==='Listings')return {id:row.id,cells:[row.title,row.profiles?.display_name??'Student',collegeName(row)??'Campus',row.status],status:row.status,action:row.status==='active'?'Remove':row.status==='removed'?'Restore':null};
      if(adminTab==='Colleges')return {id:row.id,cells:[row.name,`${row.city}, ${row.region}`,row.active?'Active':'Inactive'],status:row.active?'active':'inactive',action:row.active?'Deactivate':'Activate',raw:row};
      if(adminTab==='Deals')return {id:row.id,cells:[row.businesses?.name??'Business',row.offer,new Date(row.expires_at).toLocaleDateString(),row.demo?'Demo offer · '+row.status:row.status],status:row.status,action:row.status==='active'?'Pause':row.status==='paused'?'Activate':null,raw:row};
      if(adminTab==='Redemptions')return {id:row.id,cells:[row.id.slice(0,8).toUpperCase(),row.profiles?.display_name??'Student',row.deals?.title??'Offer',row.validated_at?'Validated':'Unused'],status:row.validated_at?'completed':'pending',action:row.validated_at?null:'Validate code',raw:row};
      return {id:row.id,cells:[row.listings?.title??'Listing',row.profiles?.display_name??'Student',row.reason,row.status],status:row.status,action:row.status==='open'?'Mark reviewed':row.status==='reviewed'?'Dismiss':null,raw:row};
    });
    const metricsLabel=adminTab==='Colleges'?'CAMPUS RECORDS':adminTab==='Deals'?'OFFER RECORDS':adminTab==='Listings'?'LISTING RECORDS':adminTab==='Redemptions'?'REDEMPTION RECORDS':'COMMUNITY REPORTS';
    return <div className="admin-screen"><aside className="admin-sidebar"><button className="admin-brand" onClick={()=>go('marketplace')}><span className="admin-shield"><Icon name="shield" size={18}/></span><span>CampusLoop<small>ADMIN CONSOLE</small></span></button><div className="admin-nav-label">WORKSPACE</div>{tabs.map((t,i)=><button key={t} onClick={()=>setAdminTab(t)} className={`admin-nav-link ${adminTab===t?'active':''}`}><Icon name={['shieldCheck','grid','pin','tag','activity','bell'][i]} size={17}/>{t}{t==='Verifications'&&adminQueue.length>0&&<i>{adminQueue.length}</i>}</button>)}<div className="admin-side-bottom"><div className="admin-user-dot">{profile?.display_name?.split(/\s+/).slice(0,2).map(name=>name[0]).join('').toUpperCase()??'AD'}</div><span><strong>{profile?.display_name??'Administrator'}</strong><small>Administrator</small></span><button onClick={()=>go('marketplace')}>↗</button></div></aside><div className="admin-main"><header className="admin-topbar"><span>Admin / <strong>{adminTab}</strong></span><div><span className="admin-live"><i/> {backendConfigured?'LIVE ADMIN':'PREVIEW ONLY'}</span><button onClick={()=>go('marketplace')}>Exit admin <Icon name="arrow" size={14}/></button></div></header><div className="admin-content"><div className="admin-heading"><div><div className="eyebrow muted-eyebrow">CAMPUSLOOP · OPERATIONS</div><h1>{adminTab} management</h1><p>{backendConfigured?view.intro:'Connect a Supabase project to manage real CampusLoop records.'}</p></div><span className={`admin-sample ${backendConfigured?'live':''}`}><span/>{backendConfigured?'LIVE DATA':'PREVIEW ONLY'}</span></div><div className="admin-metrics"><div className="admin-metric"><span>{metricsLabel}</span><strong>{backendConfigured?adminRows.length:'—'}</strong><small>{backendConfigured?'Records loaded from Supabase':'No live records in preview mode'}</small></div></div><div className="admin-queue-heading"><div><h2>{adminTab==='Redemptions'?'Redemption records':view.action}</h2><p>{backendConfigured?'Changes are applied to the selected live record.':'Admin actions are unavailable until Supabase is connected.'}</p></div>{backendConfigured&&adminTab==='Colleges'&&<button className="button button-primary button-small" onClick={()=>setAdminCollegeFormOpen(!adminCollegeFormOpen)}>Add a college <Icon name="plus" size={13}/></button>}{backendConfigured&&adminTab==='Deals'&&<button className="button button-primary button-small" disabled={!adminBusinesses.length} onClick={()=>setAdminDealFormOpen(!adminDealFormOpen)}>{adminBusinesses.length?'Create a deal':'No approved businesses'} <Icon name="plus" size={13}/></button>}</div>{adminCollegeFormOpen&&adminTab==='Colleges'&&<form className="admin-create-form" onSubmit={handleAdminCollegeCreate}><label className="field-label">College name<input name="name" required minLength="2" maxLength="160"/></label><div className="field-grid"><label className="field-label">City<input name="city" required maxLength="100"/></label><label className="field-label">State or region<input name="region" required maxLength="100"/></label><label className="field-label">Country code<input name="country" defaultValue="US" required maxLength="2"/></label></div><button className="button button-primary" disabled={adminBusy}>{adminBusy?'Saving…':'Add college'}</button></form>}{adminDealFormOpen&&adminTab==='Deals'&&<form className="admin-create-form" onSubmit={handleAdminDealCreate}><label className="field-label">Approved business<select name="businessId" required defaultValue=""><option value="" disabled>Choose a business</option>{adminBusinesses.map(business=><option key={business.id} value={business.id}>{business.name}</option>)}</select></label><label className="field-label">Deal title<input name="title" required minLength="4" maxLength="160"/></label><label className="field-label">Offer<input name="offer" required minLength="4" maxLength="500"/></label><label className="field-label">Description<textarea name="description" maxLength="2000" rows="2"/></label><div className="field-grid"><label className="field-label">Category<select name="category" required defaultValue=""><option value="" disabled>Select</option>{['Food','Technology','Stationery','Transport','Other'].map(value=><option key={value}>{value}</option>)}</select></label><label className="field-label">Expires on<input name="expiresAt" type="date" min={new Date().toISOString().slice(0,10)} required/></label></div><label className="field-label">Terms<textarea name="terms" required minLength="4" maxLength="2000" defaultValue="One redemption per verified student." rows="2"/></label><button className="button button-primary" disabled={adminBusy}>{adminBusy?'Publishing…':'Publish offer'}</button></form>}<div className="admin-manage-table"><div className="manage-head" style={{gridTemplateColumns:`repeat(${view.columns.length}, minmax(0, 1fr)) 100px`}}>{view.columns.map(label=><span key={label}>{label}</span>)}<span>ACTION</span></div>{displayRows.length?displayRows.map(row=><div className="manage-row" key={row.id} style={{gridTemplateColumns:`repeat(${view.columns.length}, minmax(0, 1fr)) 100px`}}>{row.cells.map((cell,i)=><span className={i===0?'manage-primary':''} key={`${row.id}-${i}`}>{i===row.cells.length-1?<span className={`status-pill ${['active','completed','reviewed'].includes(row.status)?'available':['open','pending','reserved'].includes(row.status)?'pending':'unverified'}`}>{cell}</span>:cell}</span>)}{row.action&&backendConfigured?<button disabled={adminBusy||adminTab==='Deals'&&row.raw?.demo} onClick={()=>void handleAdminRecordAction(adminTab,row.raw??row)}>{row.action} <Icon name="chevron" size={12}/></button>:<span>—</span>}</div>):<div className="empty-state"><h3>{backendConfigured?'No records to show':'Live records unavailable'}</h3><p>{backendConfigured?'Records will appear here as students use CampusLoop.':'Connect and deploy Supabase to load administrator records.'}</p></div>}</div><div className="admin-privacy"><Icon name="shieldCheck" size={14}/>{adminTab==='Redemptions'?'Enter a code provided by the student; only the server can confirm single-use validity.':'Administrator actions are authenticated and checked by database access policies.'}</div></div></div></div>;
  }
  function adminPage() {
    if (backendConfigured && profile?.role !== 'admin') {
      return (
        <div className="admin-screen">
          <div className="admin-content">
            <div className="empty-state">
              <h1>Administrator access required</h1>
              <p>This workspace is limited to authorized CampusLoop administrators.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                <button className="button button-outline" onClick={()=>go('marketplace')}>Return to CampusLoop</button>
                <button className="button button-primary" onClick={()=>{handleQuickDemoSignIn('admin');go('admin');}}>Switch to Admin Profile</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (adminTab !== 'Verifications') return adminManagementPage();
    const tabs=['Verifications','Listings','Colleges','Deals','Redemptions','Reports & activity'];
    const selectedSubmission=adminQueue.find(item=>item.id===selectedVerificationId)??null;
    const person=selectedSubmission?.profiles;
    const collegeName=Array.isArray(selectedSubmission?.colleges)?selectedSubmission.colleges[0]?.name:selectedSubmission?.colleges?.name;
    const initials=(selectedSubmission?.legal_name??person?.display_name??'CL').split(/\s+/).slice(0,2).map(name=>name[0]).join('').toUpperCase();
    const documentUrl=selectedSubmission?.document_url;
    const isPdf=selectedSubmission?.document_name?.toLowerCase().endsWith('.pdf');
    return <div className="admin-screen"><aside className="admin-sidebar"><button className="admin-brand" onClick={()=>go('marketplace')}><span className="admin-shield"><Icon name="shield" size={18}/></span><span>CampusLoop<small>ADMIN CONSOLE</small></span></button><div className="admin-nav-label">WORKSPACE</div>{tabs.map((t,i)=><button key={t} onClick={()=>setAdminTab(t)} className={`admin-nav-link ${adminTab===t?'active':''}`}><Icon name={['shieldCheck','grid','pin','tag','activity','bell'][i]} size={17}/>{t}{t==='Verifications'&&adminQueue.length>0&&<i>{adminQueue.length}</i>}</button>)}<div className="admin-side-bottom"><div className="admin-user-dot">{profile?.display_name?.split(/\s+/).slice(0,2).map(name=>name[0]).join('').toUpperCase()??'AD'}</div><span><strong>{profile?.display_name??'Administrator'}</strong><small>Administrator</small></span><button onClick={()=>go('marketplace')}>↗</button></div></aside><div className="admin-main"><header className="admin-topbar"><span>Admin / <strong>{adminTab}</strong></span><div><span className="admin-live"><i/> {backendConfigured?'LIVE ADMIN':'PREVIEW ONLY'}</span><button onClick={()=>go('marketplace')}>Exit admin <Icon name="arrow" size={14}/></button></div></header><div className="admin-content"><div className="admin-heading"><div><div className="eyebrow muted-eyebrow">CAMPUSLOOP · OPERATIONS</div><h1>Verification review</h1><p>Review each enrollment document before updating a student’s verification status.</p></div><span className="admin-live"><i/> PRIVATE REVIEW</span></div><div className="admin-metrics"><div className="admin-metric"><span>PENDING VERIFICATIONS</span><strong>{adminQueue.length}</strong><small>Human review required</small></div></div><div className="admin-queue-heading"><div><h2>Review queue</h2><p>Oldest submissions first · signed document links expire after two minutes.</p></div><button className="button button-outline button-small" disabled={adminBusy} onClick={async()=>{try{const result=await loadAdminQueue();const submissions=result.submissions??[];setAdminQueue(submissions);setSelectedVerificationId(submissions[0]?.id??null);}catch(error){notify(`Could not refresh the review queue: ${error.message}`);}}}>↻ Refresh queue</button></div><div className="admin-review-layout"><section className="review-queue"><div className="review-table-head"><span>STUDENT</span><span>COLLEGE</span><span>SUBMITTED</span><span>STATUS</span><span/></div>{adminQueue.length?adminQueue.map(item=>{const itemPerson=item.profiles;const name=item.legal_name??itemPerson?.display_name??'Campus student';const itemCollege=Array.isArray(item.colleges)?item.colleges[0]?.name:item.colleges?.name??'College pending';return <button className={`review-row ${item.id===selectedVerificationId?'selected':''}`} onClick={()=>setSelectedVerificationId(item.id)} key={item.id}><span className="review-name"><i>{name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</i><strong>{name}</strong></span><span>{itemCollege}</span><span>{new Date(item.created_at).toLocaleDateString()}</span><span className="status-pill pending">Pending</span><Icon name="chevron" size={15}/></button>; }):<div className="empty-state"><span className="empty-icon"><Icon name="check" size={23}/></span><h3>No pending reviews</h3><p>New enrollment submissions will appear here.</p></div>}</section>{selectedSubmission?<section className="review-detail" id="review-document"><div className="review-detail-head"><div><span className="eyebrow muted-eyebrow">ENROLLMENT SUBMISSION</span><h3>{selectedSubmission.legal_name}</h3><span>{collegeName} · {selectedSubmission.enrollment_status?.replaceAll('_',' ')}</span></div><span className="status-pill pending">Pending review</span></div>{documentUrl?<div className="document-preview live-document">{isPdf?<iframe title="Private enrollment evidence" src={documentUrl}/>:<img src={documentUrl} alt="Private enrollment evidence uploaded for review"/>}</div>:<div className="empty-state"><h3>Document preview unavailable</h3><p>Refresh the queue to request a new secure preview link.</p></div>}<div className="document-meta"><span>Private enrollment evidence</span><span>Submitted {new Date(selectedSubmission.created_at).toLocaleString()}</span></div><label className="field-label admin-notes-label">REVIEW NOTES<textarea value={adminReviewNote} onChange={e=>setAdminReviewNote(e.target.value)} maxLength="1000" placeholder="For a rejection, explain what needs to be corrected (at least 8 characters)." rows="3"/></label><div className="review-actions"><button className="button button-danger" disabled={adminBusy||adminReviewNote.trim().length<8} onClick={()=>void handleVerificationReview(selectedSubmission.id,'rejected')}>{adminBusy?'Saving…':'Reject with note'}</button><button className="button button-approve" disabled={adminBusy} onClick={()=>void handleVerificationReview(selectedSubmission.id,'approved')}>{adminBusy?'Saving…':'Approve student'} <Icon name="check" size={16}/></button></div><p className="admin-privacy"><Icon name="shieldCheck" size={14}/> Only authorized administrators can access these short-lived private document links.</p></section>:<section className="review-detail"><div className="empty-state"><h3>Select a submission</h3><p>Choose a pending request to review its private evidence.</p></div></section>}</div></div></div></div>;
  }
  function landing() {
    return <div className="landing-page"><header className="landing-nav"><Logo onClick={()=>go('landing')}/><nav><button onClick={()=>go('marketplace')}>Marketplace</button><button onClick={()=>go('deals')}>Student deals</button><button onClick={()=>document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})}>How it works</button></nav><div><button className="landing-login" onClick={()=>{setAuthMode('Log in');setShowAuth(true);}}>Log in</button><button className="button button-primary" onClick={()=>{setAuthMode('Sign up');setShowAuth(true);}}>Join CampusLoop <Icon name="arrow" size={15}/></button></div></header><section className="landing-hero"><div className="landing-hero-copy"><span className="eyebrow"><span className="eyebrow-dot"/> THE STUDENT-TO-STUDENT MARKETPLACE</span><h1>Buy. Sell. Rent.<br/>Lend. <span>From students<br/>to students.</span></h1><p>Your next great find is already on campus. Shop, share and save with students in your community.</p><div className="landing-hero-actions"><button className="button button-primary" onClick={()=>go('marketplace')}>Explore marketplace <Icon name="arrow" size={16}/></button><button className="button button-outline" onClick={()=>document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})}>How it works</button></div><div className="landing-social-proof"><span>A more thoughtful way to campus.</span></div></div><div className="landing-hero-visual"><div className="landing-main-photo"><img src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=90" alt="A book ready to be passed on to another student"/><div className="image-caption"><span>GOOD THINGS<br/>GO AROUND</span><b>↗</b></div></div><div className="landing-float-card"><span className="float-dot"></span><span><strong>That textbook you need?</strong><small>It’s already on campus.</small></span><div className="float-book"><img src="https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=120&q=80" alt=""/></div></div><div className="landing-orbit-text">PASS IT FORWARD · KEEP IT LOCAL ·</div></div></section><div className="landing-proof-bar"><span>GOOD FINDS, RIGHT AROUND THE CORNER</span><i>✳</i><span>BUILT FOR STUDENT LIFE</span><i>✳</i><span>NO UNIVERSITY EMAIL NEEDED</span><i>✳</i><span>BETTER THINGS, PASSED FORWARD</span></div><section className="landing-categories"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">A LITTLE BIT OF EVERYTHING</div><h2>Campus life, <span>covered.</span></h2></div><button className="text-button" onClick={()=>go('marketplace')}>See all finds <Icon name="arrow" size={15}/></button></div><div className="landing-category-grid">{[['Books','Read on, pass it on.','photo-1544947950-fa07a98d237f'],['Tech & electronics','The next thing you need.','photo-1498050108023-c5249f4df085'],['Bikes & transport','Find your own way.','photo-1485965120184-e220f721d03e'],['Dorm & living','Make somewhere yours.','photo-1555041469-a586c61ea9bc']].map(x=><button className="landing-category-card" key={x[0]} onClick={()=>{setCategory(x[0]==='Tech & electronics'?'Electronics':x[0]==='Dorm & living'?'Dorm & home':x[0]);go('marketplace');}}><img src={`https://images.unsplash.com/${x[2]}?auto=format&fit=crop&w=520&q=82`} alt=""/><span><strong>{x[0]}</strong><small>{x[1]}</small></span><Icon name="arrow" size={17}/></button>)}</div></section><section className="landing-how" id="how-it-works"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">EASY AS PASSING IT ON</div><h2>A few good things,<br/><span>in three little steps.</span></h2></div><p>More good finds. Less going out of your way.<br/>It’s what community is all about.</p></div><div className="three-steps">{[['01','Find your people','Pick your campus. Sign up with the email you already use.','✳'],['02','Show you’re a student','Verify securely with a student document. No university email needed.','◈'],['03','Pass it forward','Find a favorite, list a listing or discover a student perk.','↗']].map(s=><article key={s[0]}><span className="step-number">{s[0]}</span><span className="step-art">{s[3]}</span><h3>{s[1]}</h3><p>{s[2]}</p></article>)}</div></section><section className="landing-trust"><div className="trust-art"><div className="trust-card"><Icon name="shieldCheck" size={26}/><span>YOUR CAMPUSLOOP ID</span><strong>Belonging looks<br/><em>good on you.</em></strong><small>VERIFICATION BY REVIEW</small></div><span className="trust-orbit">STUDENT COMMUNITY · STUDENT COMMUNITY ·</span></div><div className="trust-copy"><div className="eyebrow muted-eyebrow">COMMUNITY COMES FIRST</div><h2>More peace of mind,<br/>by <span>students, for students.</span></h2><p>Student verification helps you see whether an account has confirmed enrollment. Documents stay private, and every submission is reviewed—not automatically approved.</p><div className="trust-points"><span><i><Icon name="check" size={14}/></i><span><strong>No university email needed</strong><small>Your personal email works just fine.</small></span></span><span><i><Icon name="check" size={14}/></i><span><strong>You control your information</strong><small>Verification documents are never public.</small></span></span></div><button className="text-button" onClick={()=>go('verification')}>Learn about verification <Icon name="arrow" size={15}/></button></div></section><section className="landing-cta"><div><span className="eyebrow">YOUR CAMPUS IS BETTER TOGETHER</span><h2>Some things just<br/>belong <em>in the loop.</em></h2><p>Find your next favorite, pass something along, and see what’s around.</p><button className="button button-light" onClick={()=>go('marketplace')}>Come on in <Icon name="arrow" size={16}/></button></div><div className="cta-sparkles"><span>✳</span><i>↗</i><b>✳</b></div></section><footer className="landing-footer"><div><Logo onClick={()=>go('landing')}/><span>Everything students need, passed forward.</span></div><div><button onClick={()=>go('marketplace')}>Marketplace</button><button onClick={()=>go('deals')}>Student deals</button><button onClick={()=>go('verification')}>Student verification</button><button onClick={()=>notify('hello@campusloop.app')}>Get in touch</button></div><small>© 2026 CampusLoop · Demo experience. Sample offers are not real partnerships.</small></footer></div>;
  }
  function authModal() {
    if (!showAuth) return null;
    const isForgot = authMode === 'Forgot password';
    const isSent = ['Email sent', 'Signup confirmation', 'Password updated'].includes(authMode);
    const isUpdate = authMode === 'Update password';
    const isSignUp = authMode === 'Sign up';
    const isLogin = authMode === 'Log in';
    const noticeTitle = authMode === 'Signup confirmation' ? 'Check your email.' : authMode === 'Password updated' ? 'You’re back in.' : 'Check your inbox.';
    const noticeMessage = authNotice || (isForgot ? 'If there’s an account for that email, we’ll send a password reset link shortly.' : 'Follow the secure link we emailed to continue.');
    return <div className="modal-scrim" onClick={()=>setShowAuth(false)}><section className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAuth(false)}><Icon name="close"/></button><Logo onClick={()=>go('landing')}/><div className="auth-modal-content"><span className="eyebrow muted-eyebrow">{isForgot||isSent||isUpdate?'ACCOUNT ACCESS':'A LITTLE CAMPUS COMMUNITY'}</span><h2>{isSent?noticeTitle:isForgot?'A fresh start.':isUpdate?'Choose a new password':isLogin?'Good to have you back.':'Find your place in the loop.'}</h2>{isSent?<div className="auth-notice"><span><Icon name={authMode==='Password updated'?'check':'clock'} size={19}/></span><p>{noticeMessage}</p>{authMode==='Password updated'&&<button className="button button-primary" onClick={()=>{setShowAuth(false);setAuthMode('Log in');go('marketplace');}}>Continue to CampusLoop <Icon name="arrow" size={14}/></button>}{authMode==='Signup confirmation'&&<button className="auth-switch" onClick={()=>{setAuthMode('Log in');setAuthNotice('');}}>Back to log in</button>}</div>:<><p>{isForgot?'Enter your personal email and we’ll send a secure password reset link.':isUpdate?'Your new password must contain at least 8 characters.':isSignUp?'A few details and you’re on your way. Personal email works just fine.':'Your campus community is just around the corner.'}</p><form onSubmit={handleAuthSubmit}>{isSignUp&&<label className="field-label">Your name<input name="displayName" required minLength="2" maxLength="80" autoComplete="name" placeholder="Emma Chen"/></label>}{!isUpdate&&<label className="field-label">Email address<input name="email" required type="email" autoComplete="email" placeholder="you@example.com"/></label>}{!isForgot&&<label className="field-label">Password<input name="password" required type="password" minLength="8" autoComplete={isSignUp||isUpdate?'new-password':'current-password'} placeholder="At least 8 characters"/></label>}<button className="button button-primary auth-submit" disabled={backendBusy} type="submit">{backendBusy?'Working…':isForgot?'Send reset link':isUpdate?'Update password':isSignUp?'Create my account':'Log in'} <Icon name="arrow" size={15}/></button></form>{isLogin&&<button className="auth-switch forgot-link" onClick={()=>{setAuthNotice('');setAuthMode('Forgot password');}}>Forgot your password?</button>}{(isLogin||isSignUp)&&<button className="auth-switch" onClick={()=>{setAuthNotice('');setAuthMode(isSignUp?'Log in':'Sign up');}}>{isSignUp?'Already have an account? Log in':'New to CampusLoop? Create an account'}</button>}{isForgot&&<button className="auth-switch" onClick={()=>setAuthMode('Log in')}>Back to log in</button>}<div className="quick-access-box" style={{marginTop:'14px',paddingTop:'10px',borderTop:'1px solid var(--line)',textAlign:'center'}}><p style={{fontSize:'12px',color:'var(--muted)',marginBottom:'8px'}}>Quick hackathon demo access:</p><div style={{display:'flex',gap:'8px',justifyContent:'center'}}><button type="button" className="button button-outline button-small" onClick={()=>handleQuickDemoSignIn('student')}>Demo Student</button><button type="button" className="button button-outline button-small" onClick={()=>handleQuickDemoSignIn('admin')}>Admin Console</button></div></div></>}{!isSent&&<small>By continuing, you agree to our community guidelines and terms. No university email required.</small>}</div></section></div>;
  }
  function collegeModal() {
    if (!showCollege) return null;
    const options = backendConfigured ? collegeOptions : [
      { id: null, name: 'Stanford University', city: 'Stanford', region: 'California' },
      { id: null, name: 'University of California, Berkeley', city: 'Berkeley', region: 'California' },
    ];
    return <div className="modal-scrim" onClick={()=>setShowCollege(false)}><section className="college-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowCollege(false)}><Icon name="close"/></button><span className="eyebrow muted-eyebrow">{signupOnboarding?'ONE LAST THING':'YOUR CAMPUS, YOUR COMMUNITY'}</span><h2>{signupOnboarding?'Pick your campus.':'Where do you go?'}</h2><p>{signupOnboarding?'Choose your college to finish setting up your account.':'Choose a campus to find nearby student listings.'}</p><div className="college-options">{options.map(option=><button className={college===option.name?'selected':''} key={option.id??option.name} onClick={()=>void handleSelectCollege(option)}><span className="college-avatar">{option.name.includes('Stanford')?'S':option.name.includes('Berkeley')?'B':'✳'}</span><span><strong>{option.name}</strong><small>{option.city}, {option.region}</small></span>{college===option.name?<span className="college-tick"><Icon name="check" size={15}/></span>:<Icon name="chevron" size={16}/>}</button>)}</div>{!signupOnboarding&&<button className="request-college" onClick={()=>{if(!session?.user?.id){setShowCollege(false);setAuthMode('Sign up');setShowAuth(true);notify('Sign in before sending a college request.');return;}setShowCollege(false);setShowRequestCollege(true);}}>Can’t find your college? <span>Request it <Icon name="arrow" size={13}/></span></button>}</section></div>;
  }
  function requestCollegeModal() {
    if (!showRequestCollege) return null;
    return <div className="modal-scrim" onClick={()=>setShowRequestCollege(false)}><section className="college-modal request-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowRequestCollege(false)}><Icon name="close"/></button><span className="eyebrow muted-eyebrow">GROWING THE COMMUNITY</span><h2>Let’s add your campus.</h2><p>Tell us a little about your school and we’ll review your request.</p><form onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);try{await saveCollegeRequest(session.user.id,{collegeName:data.get('collegeName'),city:data.get('city'),region:data.get('region')});setShowRequestCollege(false);notify('Thanks — your campus request has been sent for review.');}catch(error){notify(`Could not send the request: ${error.message}`);}}}><label className="field-label">College or university<input required name="collegeName" minLength="2" maxLength="160" placeholder="Your college name"/></label><div className="field-grid"><label className="field-label">City<input required name="city" minLength="2" maxLength="100" placeholder="Berkeley"/></label><label className="field-label">State or region<input required name="region" minLength="2" maxLength="100" placeholder="California"/></label></div><button className="button button-primary auth-submit" type="submit">Send campus request <Icon name="arrow" size={15}/></button></form><small className="request-note">Your signed-in account email is attached to this request.</small></section></div>;
  }
  function registrationSuccessPage() {
    return <div className="registration-success-page"><div className="registration-success-card"><div className="registration-success-icon"><Icon name="check" size={25}/></div><span className="eyebrow muted-eyebrow">YOU’RE IN THE LOOP</span><h1>Welcome, {profile?.display_name || 'campus student'}.</h1><p>Your account is ready and your campus is set to <strong>{profile?.college_name || college}</strong>. You can start exploring or verify your student status when you’re ready.</p><button className="button button-primary" onClick={()=>go('marketplace')}>Explore your marketplace <Icon name="arrow" size={16}/></button><button className="text-button" onClick={()=>go('verification')}>Verify my student status <Icon name="chevron" size={14}/></button></div></div>;
  }
  function detailModal() {
    if (!selected) return null;
    const isOwnListing = selected.seller_id && selected.seller_id === (session?.user?.id || profile?.id);
    const canRequest = !isOwnListing;
    const dateText = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return <div className="modal-scrim detail-scrim" onClick={() => setSelected(null)}><section className="detail-modal" onClick={e => e.stopPropagation()}><button className="modal-close detail-close" onClick={() => setSelected(null)}><Icon name="close"/></button><div className="detail-image"><img src={productPhoto(selected, 900)} alt={selected.name}/><span className={`listing-tag ${selected.type === 'For rent' ? 'rent' : selected.type === 'Free lending' ? 'free' : ''}`}>{selected.type}</span></div><div className="detail-content"><span className="eyebrow muted-eyebrow">{selected.category.toUpperCase()} · {selected.condition.toUpperCase()}</span><h2>{selected.name}</h2><div className="detail-price">{selected.price ? `${formatRupees(selected.price)}${selected.unit || ''}` : 'Free'}</div><p>{selected.description || `This item is in ${selected.condition.toLowerCase()} condition and ready for a new home. Message the student to arrange an easy campus pickup.`}</p><div className="detail-facts"><span><Icon name="pin" size={16}/><span><strong>{selected.college}</strong><small>{selected.pickup_area || 'Campus pickup area'}</small></span></span><span><Icon name="clock" size={16}/><span><strong>{selected.type === 'For rent' ? 'Rental availability' : selected.type === 'Free lending' ? 'Return required' : 'Availability'}</strong><small>{selected.type === 'For sale' ? 'Arrange a time together' : `${dateText(selected.available_from) || 'Available now'}${selected.available_until ? ` – ${dateText(selected.available_until)}` : ''}`}</small></span></span></div><div className="seller-card"><span className="seller-avatar large-avatar">{selected.initials}</span><span><strong>{selected.seller}</strong><small>Member of your campus community</small></span>{selected.sellerVerified && <span className="seller-verified"><Icon name="shieldCheck" size={14}/> Verified</span>}</div>{canRequest && selected.type !== 'For sale' && <div className="request-dates"><label className="field-label">Requested pickup date<input type="date" min={selected.available_from && selected.available_from > today ? selected.available_from : today} max={selected.available_until || undefined} value={requestStartDate} onChange={e => { setRequestStartDate(e.target.value); if (requestReturnDate && e.target.value > requestReturnDate) setRequestReturnDate(''); }} required/></label><label className="field-label">Requested return date<input type="date" min={requestStartDate && requestStartDate > today ? requestStartDate : selected.type === 'For rent' ? tomorrow : today} max={selected.available_until || undefined} value={requestReturnDate} onChange={e => setRequestReturnDate(e.target.value)} required/></label><small>Choose your requested dates; agree the pickup details directly with the lender.</small></div>}{canRequest && <label className="field-label request-message-field">Message the student<textarea rows="2" maxLength="1000" value={requestMessage} onChange={e => setRequestMessage(e.target.value)} required/></label>}<div className="detail-actions"><button className="button button-primary" disabled={backendBusy || isOwnListing} onClick={() => void handleItemRequest(selected)}>{isOwnListing ? 'Your listing' : backendBusy ? 'Sending…' : 'Request item'} <Icon name="arrow" size={15}/></button><button className={`button button-outline ${saved.includes(selected.id) ? 'saved-action' : ''}`} onClick={() => void toggleSave(selected.id)}><Icon name="heart" size={16}/>{saved.includes(selected.id) ? 'Saved' : 'Save item'}</button></div>{!canRequest && !isOwnListing && <div className="demo-note">Sign in to coordinate pickup with fellow campus students.</div>}{!isOwnListing && <button className="report-button" onClick={() => void handleReport(selected)}>Report this listing</button>}</div></section></div>;
  }
  function dealModal() {
    if (!dealSelected) return null;
    const isDemo=Boolean(dealSelected.demo);
    return <div className="modal-scrim" onClick={()=>setDealSelected(null)}><section className="deal-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setDealSelected(null)}><Icon name="close"/></button><span className={`deal-modal-mark ${dealSelected.tone}`}>{dealSelected.mark}</span>{isDemo&&<span className="demo-tag">DEMO OFFER</span>}<div className="deal-category-label">{dealSelected.category.toUpperCase()} · STUDENT OFFER</div><h2>{dealSelected.offer}</h2><h3>at {dealSelected.name}</h3><p>{dealSelected.detail}. A current, verified student account is required to redeem a live offer.</p><div className="deal-terms"><Icon name="clock" size={15}/> Valid through {dealSelected.expires} <span>·</span> One per student</div>{couponResult?.code?<div className="redeem-success"><div className="success-check"><Icon name="check"/></div><h3>Offer reserved for you.</h3><p>Show this unique code to the business. Keep it open until it has been validated.</p><QRCodeSVG value={couponResult.code} size={132} level="M" title="Single-use student offer redemption code"/><code>{couponResult.code}</code><button className="button button-outline" onClick={()=>void copyCouponCode(couponResult.code)}>Copy one-time code</button><small>{couponResult.demo?'Demo offer · not valid at a real business':'Single-use code · shown once'}</small></div>:isDemo?<div className="demo-note">This sample offer is for preview only. No real partnership or redemption code is available.</div>:<>{dealMessage&&<div className="review-feedback rejected" role="alert"><strong>Offer not redeemed</strong><p>{dealMessage}</p></div>}{redeemConfirm?<div className="redeem-confirm"><h3>Redeem this student offer?</h3><p>CampusLoop will check your active verified status and issue a single-use code. You can’t redeem the same offer twice.</p><div className="detail-actions"><button className="button button-outline" disabled={backendBusy} onClick={()=>setRedeemConfirm(false)}>Not now</button><button className="button button-primary" disabled={backendBusy} onClick={()=>void handleDealRedemption(dealSelected)}>{backendBusy?'Checking…':'Confirm redemption'}</button></div></div>:<button className="button button-primary redeem-button" onClick={()=>{setDealMessage('');setRedeemConfirm(true);}}>Redeem this offer <Icon name="arrow" size={15}/></button>}</>}<small className="deal-demo-warning">{isDemo?'Sample content only. No real business partnership or offer is implied.':'Your student status and offer eligibility are checked securely when you redeem.'}</small></section></div>;
  }

  if (screen === 'landing') return <>{landing()}{authModal()}{collegeModal()}{requestCollegeModal()}{toast&&<Toast message={toast}/>}</>;
  if (screen === 'registration-success') return <>{registrationSuccessPage()}{toast&&<Toast message={toast}/>}</>;
  if (screen === 'admin') return <>{adminPage()}{toast&&<Toast message={toast}/>}</>;
  const content = screen==='marketplace'?marketplace():screen==='activity'?activityPage():screen==='sell'?sellPage():screen==='verification'?verificationPage():screen==='identity'?studentIdPage():screen==='deals'?dealsPage():screen==='business'?businessCouponPage():screen==='qr-result'?qrResult():screen==='saved'?<div className="page-content"><PageTitle eyebrow="YOUR LITTLE COLLECTION" title="Saved for later." subtitle="All the things you’re keeping an eye on."/><div className="product-grid saved-grid">{listingRows.filter(p=>saved.includes(p.id)).map(p=><ProductCard key={p.id} product={p} saved={true} onSave={toggleSave} onOpen={openListing}/>)}</div>{!listingRows.some(p=>saved.includes(p.id))&&<div className="empty-state"><span className="empty-icon"><Icon name="heart" size={23}/></span><h3>A little room for favorites.</h3><p>{backendConfigured&&!session?'Sign in to see your saved campus listings.':'Tap the heart on a listing and it’ll be right here when you need it.'}</p><button className="button button-outline" onClick={()=>backendConfigured&&!session?(setAuthMode('Sign up'),setShowAuth(true)):go('marketplace')}>{backendConfigured&&!session?'Sign in':'Explore the marketplace'}</button></div>}</div>:marketplace();
  return <div className="app-shell">{header()}<div className="app-layout">{sidebar()}<main className={`main-content ${screen==='marketplace'?'market-main':''}`}><button className="mobile-menu-button" onClick={()=>setMobileNav(!mobileNav)}><Icon name="grid" size={17}/> {mobileNav?'Close menu':'Browse campus'} <Icon name="down" size={14}/></button>{content}</main></div><nav className="mobile-bottom-nav">{[['marketplace','Home','grid'],['marketplace','Browse','search'],['sell','List','plus'],['identity','Student ID','id'],['activity','Profile','activity']].map(([id,label,ic],i)=><button key={i} className={(screen===id&&(i===0||i===3||i===4)?'active':'')} onClick={()=>go(id)}><Icon name={ic} size={19}/><span>{label}</span></button>)}</nav>{selected&&detailModal()}{dealSelected&&dealModal()}{authModal()}{collegeModal()}{requestCollegeModal()}{toast&&<Toast message={toast}/>}</div>;
}

function Toast({message}){return <div className="toast"><span><Icon name="check" size={15}/></span>{message}</div>;}
function PageTitle({eyebrow,title,subtitle,action}){return <div className="page-title-row"><div><div className="eyebrow muted-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action&&<div className="page-title-action">{action}</div>}</div>;}

export default App;
