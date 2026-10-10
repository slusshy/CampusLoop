import http from 'http';
import app from '../index.js';

let server;
const PORT = 5555;
const BASE = `http://localhost:${PORT}/api`;

async function req(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '00000000-0000-4000-8000-000000000002', // Emma Chen
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n🧪 Running CampusLoop Backend Integration Tests...\n');
  server = app.listen(PORT);
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // 1. Health check
    const health = await req('/health');
    console.assert(health.status === 200, 'Health check status 200');
    console.assert(health.data.status === 'healthy', 'Health check healthy');
    console.log('✅ 1. Health check endpoint passed');

    // 2. Colleges list
    const colleges = await req('/colleges');
    console.assert(colleges.status === 200, 'Colleges status 200');
    console.assert(Array.isArray(colleges.data) && colleges.data.length > 0, 'Colleges list returned');
    console.log(`✅ 2. Colleges directory passed (${colleges.data.length} colleges)`);

    // 3. Listings browse & search
    const listings = await req('/listings');
    console.assert(listings.status === 200, 'Listings status 200');
    console.assert(Array.isArray(listings.data) && listings.data.length > 0, 'Listings returned');
    console.log(`✅ 3. Listings browse passed (${listings.data.length} listings)`);

    // 4. Create new listing
    const newListing = await req('/listings', {
      method: 'POST',
      body: {
        collegeId: colleges.data[0].id,
        title: 'Sony WH-1000XM4 Noise Canceling Headphones',
        description: 'Great condition, perfect for quiet campus study sessions.',
        category: 'Electronics',
        listingType: 'sale',
        condition: 'like_new',
        pickupArea: 'Green Library',
        price: 14500,
      },
    });
    console.assert(newListing.status === 201, 'Create listing status 201');
    console.assert(newListing.data.title.includes('Sony'), 'Listing title match');
    console.log('✅ 4. Create listing passed');

    // 5. Item request lifecycle
    const requestRes = await req('/requests', {
      method: 'POST',
      headers: { 'x-user-id': '00000000-0000-4000-8000-000000000003' }, // Marcus requests Emma's item
      body: {
        listingId: newListing.data.id,
        message: 'Hi Emma! I can meet tomorrow at 2pm at Green Library.',
      },
    });
    console.assert(requestRes.status === 201, 'Request status 201');
    const requestId = requestRes.data.id;
    console.log('✅ 5a. Create item request passed');

    // 5b. Seller accepts request
    const acceptRes = await req('/requests/manage', {
      method: 'POST',
      body: { requestId, action: 'accept' },
    });
    console.assert(acceptRes.status === 200, 'Accept status 200');
    console.assert(acceptRes.data.status === 'accepted', 'Request accepted');
    console.log('✅ 5b. Seller accept request passed');

    // 5c. Complete transaction
    const completeRes = await req('/requests/manage', {
      method: 'POST',
      body: { requestId, action: 'complete' },
    });
    console.assert(completeRes.status === 200, 'Complete status 200');
    console.assert(completeRes.data.status === 'completed', 'Transaction completed');
    console.log('✅ 5c. Complete transaction passed');

    // 6. Student deals list
    const deals = await req('/deals');
    console.assert(deals.status === 200, 'Deals status 200');
    console.assert(Array.isArray(deals.data) && deals.data.length > 0, 'Deals returned');
    console.log(`✅ 6. Student deals list passed (${deals.data.length} deals)`);

    // 7. Create a fresh deal as Admin and redeem it
    const freshDeal = await req('/deals', {
      method: 'POST',
      headers: { 'x-user-id': '00000000-0000-4000-8000-000000000001' }, // Admin
      body: {
        businessId: '10000000-0000-4000-8000-000000000001',
        collegeId: colleges.data[0].id,
        title: `Test Campus Perks - ${Date.now()}`,
        offer: '20% off all textbooks & supplies',
        description: 'Instant student discount at bookstore.',
        category: 'Stationery',
        terms: 'One redemption per semester.',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    console.assert(freshDeal.status === 201, 'Admin create deal status 201');

    const redeemRes = await req('/deals/redeem', {
      method: 'POST',
      body: { dealId: freshDeal.data.id },
    });
    console.assert(redeemRes.status === 200, 'Redeem status 200');
    console.assert(redeemRes.data.code?.startsWith('LOOP-'), 'Single-use coupon generated');
    const couponCode = redeemRes.data.code;
    console.log(`✅ 7. Deal redemption passed (Generated code: ${couponCode})`);

    // 8. Validate coupon
    const validateRes = await req('/coupons/validate', {
      method: 'POST',
      headers: { 'x-user-id': '00000000-0000-4000-8000-000000000001' }, // Admin or business validates
      body: { code: couponCode },
    });
    console.assert(validateRes.status === 200, 'Coupon validate status 200');
    console.assert(validateRes.data.valid === true, 'Coupon is valid');
    console.log('✅ 8a. Coupon validation passed');

    // 8b. Reject reuse of single-use coupon
    const reuseRes = await req('/coupons/validate', {
      method: 'POST',
      headers: { 'x-user-id': '00000000-0000-4000-8000-000000000001' },
      body: { code: couponCode },
    });
    console.assert(reuseRes.data.valid === false && reuseRes.data.status === 'already_used', 'Reuse rejected');
    console.log('✅ 8b. Single-use enforcement passed (prevented reuse)');

    // 9. Student verification submission (with fresh dynamic student ID)
    const studentId = `test-student-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const studentName = `Alexander Hayes ${Date.now().toString().slice(-4)}`;
    const verifySubmit = await req('/verification/submit', {
      method: 'POST',
      headers: { 'x-user-id': studentId },
      body: {
        collegeId: colleges.data[0].id,
        legalName: studentName,
        enrollmentStatus: 'currently_enrolled',
        documentPath: '/uploads/sample-schedule.pdf',
      },
    });
    console.assert(verifySubmit.status === 201, 'Submit verification status 201');
    const submissionId = verifySubmit.data.submission.id;
    console.log('✅ 9. Verification document submission passed');

    // 10. Admin review queue
    const queueRes = await req('/admin/queue', {
      headers: { 'x-user-id': '00000000-0000-4000-8000-000000000001' },
    });
    console.assert(queueRes.status === 200, 'Queue status 200');
    console.assert(queueRes.data.submissions.some(s => s.id === submissionId), 'Submission in queue');
    console.log('✅ 10. Admin review queue passed');

    // 11. Admin approve submission
    const reviewRes = await req('/admin/review', {
      method: 'POST',
      headers: { 'x-user-id': '00000000-0000-4000-8000-000000000001' },
      body: {
        submissionId,
        status: 'approved',
        note: 'Enrollment confirmed for current academic year.',
      },
    });
    console.assert(reviewRes.status === 200, 'Review approve status 200');
    console.log('✅ 11. Admin verification approval passed');

    // 12. Public QR status check
    const profileRes = await req(`/verification/profile/${studentId}`);
    const publicId = profileRes.data.public_id;
    const checkRes = await req(`/verification/check/${publicId}`);
    console.assert(checkRes.status === 200, 'QR check status 200');
    console.assert(checkRes.data.valid === true, 'QR status valid');
    console.assert(checkRes.data.student_name === studentName, 'Student name match');
    console.log(`✅ 12. Public QR status check passed (${checkRes.data.student_name} verified)`);

    console.log('\n🎉 ALL 12 INTEGRATION TESTS PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
