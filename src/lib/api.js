const API_BASE = import.meta.env.VITE_API_URL || '/api';

let getSessionToken = () => null;
let getCurrentUser = () => null;

export function setAuthTokenGetter(tokenGetter, userGetter) {
  getSessionToken = tokenGetter;
  if (userGetter) getCurrentUser = userGetter;
}

async function request(endpoint, options = {}) {
  const token = getSessionToken?.();
  const user = getCurrentUser?.();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (user?.id) {
    headers['x-user-id'] = user.id;
    if (user.email) headers['x-user-email'] = user.email;
  }

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    throw new Error(errorMsg);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export const api = {
  get: (endpoint, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    return request(`${endpoint}${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),

  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),

  upload: async (file, bucket = 'listing-images') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    const result = await request('/upload', { method: 'POST', body: formData });
    return result.url || result.path;
  },

  // Service Methods
  loadColleges: () => api.get('/colleges'),

  loadProfile: (userId) => api.get(`/verification/profile/${userId}`),

  selectCollege: (collegeId) => api.patch('/verification/profile', { collegeId }),

  loadListings: (params) => api.get('/listings', params),

  createListing: (values, imagePath) => api.post('/listings', { ...values, imagePath }),

  loadFavorites: () => api.get('/listings/favorites'),

  toggleFavorite: (listingId, isSaved) => api.post(`/listings/${listingId}/favorite`, { isSaved }),

  reportListing: (listingId, reason) => api.post(`/listings/${listingId}/report`, { reason }),

  requestCollege: (values) => api.post('/colleges/request', values),

  loadDeals: (params) => api.get('/deals', params),

  redeemDeal: (dealId) => api.post('/deals/redeem', { dealId }),

  validateCoupon: (code) => api.post('/coupons/validate', { code }),

  createItemRequest: (listingId, message, requestedFrom, requestedUntil) =>
    api.post('/requests', { listingId, message, requestedFrom, requestedUntil }),

  manageRequest: (requestId, action, returnBy) =>
    api.post('/requests/manage', { requestId, action, returnBy }),

  loadActivity: (type) => api.get('/requests/activity', { type }),

  submitVerification: (values, documentPath) =>
    api.post('/verification/submit', { ...values, documentPath }),

  verifyStudentId: (publicId) => api.get(`/verification/check/${publicId}`),

  // Admin Methods
  loadAdminQueue: () => api.get('/admin/queue'),

  reviewVerification: (submissionId, status, note) =>
    api.post('/admin/review', { submissionId, status, note }),

  loadAdminResource: (resource) => api.get(`/admin/resource/${encodeURIComponent(resource)}`),

  updateAdminResource: (resource, id, values) =>
    api.patch(`/admin/resource/${encodeURIComponent(resource)}/${id}`, values),

  createAdminCollege: (values) => api.post('/colleges', values),

  createAdminDeal: (values) => api.post('/deals', values),

  loadAdminBusinesses: () => api.get('/admin/businesses'),
};
