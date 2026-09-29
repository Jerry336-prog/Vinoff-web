import api from '../services/api';

const VISITOR_KEY = 'vinoff_visitor_id';
const SESSION_KEY = 'vinoff_session_id';
const SESSION_SOURCE_KEY = 'vinoff_session_source';

/**
 * Generates a simple, robust UUID v4 string
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback below
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Gets or creates persistent visitor ID across browser restarts
 */
export const getVisitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch (e) {
    return generateUUID();
  }
};

/**
 * Gets or creates session ID for current browser tab
 */
export const getSessionId = () => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch (e) {
    return generateUUID();
  }
};

/**
 * Identifies traffic source based on URL UTMs, referrer, and user-agent
 */
export const detectTrafficSource = () => {
  try {
    // 1. Check if source already stored for this active session
    const cachedSource = sessionStorage.getItem(SESSION_SOURCE_KEY);
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = (searchParams.get('utm_source') || searchParams.get('ref') || searchParams.get('source') || '').toLowerCase();
    const referrer = (document.referrer || '').toLowerCase();
    const ua = (navigator.userAgent || '').toLowerCase();

    // Priority to explicit UTM tags or URL query params
    if (utmSource.includes('tiktok') || referrer.includes('tiktok.com') || referrer.includes('bytedance') || ua.includes('trill') || ua.includes('musical_ly')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'TikTok');
      return 'TikTok';
    }
    if (utmSource.includes('instagram') || referrer.includes('instagram.com') || referrer.includes('cdninstagram') || ua.includes('instagram')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Instagram');
      return 'Instagram';
    }
    if (utmSource.includes('whatsapp') || referrer.includes('whatsapp.com') || referrer.includes('wa.me') || referrer.includes('api.whatsapp.com') || ua.includes('whatsapp')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'WhatsApp');
      return 'WhatsApp';
    }
    if (utmSource.includes('google') || referrer.includes('google.com') || referrer.includes('google.') || referrer.includes('googlequicksearchbox')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Google Search');
      return 'Google Search';
    }
    if (utmSource.includes('facebook') || utmSource.includes('fb') || referrer.includes('facebook.com') || referrer.includes('fb.me')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Facebook');
      return 'Facebook';
    }
    if (utmSource.includes('twitter') || utmSource.includes('x.com') || referrer.includes('t.co') || referrer.includes('twitter.com') || referrer.includes('x.com')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'X (Twitter)');
      return 'X (Twitter)';
    }

    // If an external non-social referrer exists
    if (referrer && !referrer.includes(window.location.hostname) && !referrer.includes('localhost')) {
      sessionStorage.setItem(SESSION_SOURCE_KEY, 'Other Referral');
      return 'Other Referral';
    }

    // If we already detected a source earlier in this session, retain it for inner pages
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
    const now = Date.now();
    // Throttle duplicate hits to same path within 3 seconds
    if (lastTrackedPath === pathname && now - lastTrackedTime < 3000) {
      return;
    }
    lastTrackedPath = pathname;
    lastTrackedTime = now;

    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const source = detectTrafficSource();
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
      path: pathname || window.location.pathname,
      landingPage: window.location.pathname,
      utmSource: searchParams.get('utm_source') || '',
      utmMedium: searchParams.get('utm_medium') || '',
      utmCampaign: searchParams.get('utm_campaign') || '',
      device,
      browser,
      os,
    };

    // Post to backend silently (never disrupts the UI)
    await api.post('/api/analytics/track', payload).catch(() => {});
  } catch (err) {
    // Fail silently in background
  }
};
