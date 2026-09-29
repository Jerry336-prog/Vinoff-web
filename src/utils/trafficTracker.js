import api from '../services/api';

const VISITOR_KEY = 'vinoff_visitor_id';
const SESSION_KEY = 'vinoff_session_id';
const SESSION_SOURCE_KEY = 'vinoff_session_source';
const SESSION_LANDING_KEY = 'vinoff_session_landing';

// In-memory module cache guarantees the ID never changes during active SPA browsing
let memoryVisitorId = null;
let memorySessionId = null;

/**
 * Cookie read helper
 */
const getCookie = (name) => {
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Cookie write helper (1 year persistent)
 */
const setCookie = (name, value, days = 365) => {
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {}
};

/**
 * Robust device fingerprinting based on stable hardware & browser environment
 */
export const getDeviceFingerprint = () => {
  try {
    const screenData = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    const cores = navigator.hardwareConcurrency || 4;
    const ua = navigator.userAgent || '';
    const raw = `${ua}__${screenData}__${timeZone}__${lang}__${cores}`;

    // Fast 32-bit FNV-1a hash
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'dev_' + (hash >>> 0).toString(36);
  } catch (e) {
    return 'dev_general';
  }
};

/**
 * Generates a simple, robust UUID v4 string
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Persistent Visitor ID across browser sessions & tab transitions
 * Priority: Memory -> LocalStorage -> Cookie -> DeviceFingerprint
 */
export const getVisitorId = () => {
  // 1. In-memory cache
  if (memoryVisitorId) {
    return memoryVisitorId;
  }

  // 2. LocalStorage
  try {
    const local = localStorage.getItem(VISITOR_KEY);
    if (local) {
      memoryVisitorId = local;
      setCookie('vinoff_vid', local);
      return local;
    }
  } catch (e) {}

  // 3. Document Cookie
  const cookieId = getCookie('vinoff_vid');
  if (cookieId) {
    memoryVisitorId = cookieId;
    try {
      localStorage.setItem(VISITOR_KEY, cookieId);
    } catch (e) {}
    return cookieId;
  }

  // 4. Generate stable ID tied to this device
  const fp = getDeviceFingerprint();
  const newId = `${fp}_${generateUUID().slice(0, 8)}`;
  memoryVisitorId = newId;

  try {
    localStorage.setItem(VISITOR_KEY, newId);
  } catch (e) {}
  setCookie('vinoff_vid', newId);

  return newId;
};

/**
 * Session ID for the active browsing session (persists across sub-pages)
 */
export const getSessionId = () => {
  if (memorySessionId) {
    return memorySessionId;
  }

  try {
    const local = sessionStorage.getItem(SESSION_KEY);
    if (local) {
      memorySessionId = local;
      return local;
    }
  } catch (e) {}

  const newSessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  memorySessionId = newSessionId;

  try {
    sessionStorage.setItem(SESSION_KEY, newSessionId);
  } catch (e) {}

  return newSessionId;
};

/**
 * Identifies traffic source based on URL UTMs, referrer, and user-agent
 * Preserves the entry source across all sub-page navigations in this session
 */
export const detectTrafficSource = () => {
  try {
    const cachedSource = sessionStorage.getItem(SESSION_SOURCE_KEY);
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = (searchParams.get('utm_source') || searchParams.get('ref') || searchParams.get('source') || '').toLowerCase();
    const referrer = (document.referrer || '').toLowerCase();
    const ua = (navigator.userAgent || '').toLowerCase();

    // Priority to explicit UTM tags or URL query params on landing
    if (
      utmSource.includes('tiktok') ||
      referrer.includes('tiktok.com') ||
      referrer.includes('bytedance') ||
      ua.includes('trill') ||
      ua.includes('musical_ly')
    ) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'TikTok');
      return 'TikTok';
    }
    if (
      utmSource.includes('instagram') ||
      referrer.includes('instagram.com') ||
      referrer.includes('cdninstagram') ||
      ua.includes('instagram')
    ) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Instagram');
      return 'Instagram';
    }
    if (
      utmSource.includes('whatsapp') ||
      referrer.includes('whatsapp.com') ||
      referrer.includes('wa.me') ||
      referrer.includes('api.whatsapp.com') ||
      ua.includes('whatsapp')
    ) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'WhatsApp');
      return 'WhatsApp';
    }
    if (
      utmSource.includes('google') ||
      referrer.includes('google.com') ||
      referrer.includes('google.') ||
      referrer.includes('googlequicksearchbox')
    ) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Google Search');
      return 'Google Search';
    }
    if (
      utmSource.includes('facebook') ||
      utmSource.includes('fb') ||
      referrer.includes('facebook.com') ||
      referrer.includes('fb.me')
    ) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Facebook');
      return 'Facebook';
    }
    if (
      utmSource.includes('twitter') ||
      utmSource.includes('x.com') ||
      referrer.includes('t.co') ||
      referrer.includes('twitter.com') ||
      referrer.includes('x.com')
    ) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'X (Twitter)');
      return 'X (Twitter)';
    }

    if (referrer && !referrer.includes(window.location.hostname) && !referrer.includes('localhost')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Other Referral');
      return 'Other Referral';
    }

    // If source was already detected on initial landing page in this session, keep it
    if (cachedSource) {
      return cachedSource;
    }

    // Direct / Browser typed address or opened directly in Chrome / Safari
    sessionStorage.setItem(SESSION_SOURCE_KEY, 'Direct / Browser');
    return 'Direct / Browser';
  } catch (e) {
    return 'Direct / Browser';
  }
};

/**
 * Gets or stores the landing page of this session
 */
export const getLandingPage = (currentPath) => {
  try {
    let landing = sessionStorage.getItem(SESSION_LANDING_KEY);
    if (!landing) {
      landing = currentPath || window.location.pathname || '/';
      sessionStorage.setItem(SESSION_LANDING_KEY, landing);
    }
    return landing;
  } catch (e) {
    return currentPath || '/';
  }
};

/**
 * Detects device category: mobile, desktop, tablet
 */
export const detectDevice = () => {
  const ua = (navigator.userAgent || '').toLowerCase();
  const width = window.innerWidth || screen.width;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 768 && width <= 1024)) {
    return 'tablet';
  }
  if (/(mobi|ipod|phone|blackberry|opera mini)/i.test(ua) || width < 768) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Detects client browser
 */
export const detectBrowser = () => {
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('instagram')) return 'Instagram In-App';
  if (ua.includes('trill') || ua.includes('bytedance') || ua.includes('musical_ly')) return 'TikTok In-App';
  if (ua.includes('whatsapp')) return 'WhatsApp In-App';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('chromium')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('samsungbrowser')) return 'Samsung Internet';
  return 'Other Browser';
};

/**
 * Detects client Operating System
 */
export const detectOS = () => {
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('linux')) return 'Linux';
  return 'Other';
};

let lastTrackedPath = '';
let lastTrackedTime = 0;

/**
 * Sends a visitor track payload to backend
 */
export const trackPageView = async (pathname, user = null) => {
  try {
    const currentPath = pathname || window.location.pathname || '/';
    const now = Date.now();

    // Prevent duplicate rapid calls to the same page within 2.5 seconds
    if (lastTrackedPath === currentPath && now - lastTrackedTime < 2500) {
      return;
    }
    lastTrackedPath = currentPath;
    lastTrackedTime = now;

    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const source = detectTrafficSource();
    const landingPage = getLandingPage(currentPath);
    const device = detectDevice();
    const browser = detectBrowser();
    const os = detectOS();
    const searchParams = new URLSearchParams(window.location.search);

    const payload = {
      visitorId,
      sessionId,
      userId: user?._id || user?.id || null,
      source,
      referrer: document.referrer || '',
      path: currentPath,
      landingPage,
      utmSource: searchParams.get('utm_source') || '',
      utmMedium: searchParams.get('utm_medium') || '',
      utmCampaign: searchParams.get('utm_campaign') || '',
      device,
      browser,
      os,
    };

    // Post to backend silently
    await api.post('/api/analytics/track', payload).catch(() => {});
  } catch (err) {
    // Fail silently in background
  }
};
