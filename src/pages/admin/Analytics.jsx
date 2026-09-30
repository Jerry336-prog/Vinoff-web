import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  TrendingUp,
  Users,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  RefreshCw,
  Share2,
  ExternalLink,
  Clock,
  Compass,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';

// Brand styling for traffic sources
const SOURCE_CONFIG = {
  TikTok: {
    color: 'bg-black text-white border-black',
    pillBg: 'bg-slate-900 text-white border-slate-800',
    barColor: 'bg-slate-900',
    description: 'TikTok bio link, videos & in-app browser',
  },
  Instagram: {
    color: 'bg-pink-600 text-white border-pink-500',
    pillBg: 'bg-gradient-to-r from-purple-50 text-pink-700 border-pink-200',
    barColor: 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500',
    description: 'Instagram profile, story swipe & bio links',
  },
  WhatsApp: {
    color: 'bg-emerald-600 text-white border-emerald-500',
    pillBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    barColor: 'bg-emerald-600',
    description: 'WhatsApp direct chats & catalog links',
  },
  'Google Search': {
    color: 'bg-blue-600 text-white border-blue-500',
    pillBg: 'bg-blue-50 text-blue-800 border-blue-200',
    barColor: 'bg-blue-600',
    description: 'Organic Google searches & Chrome queries',
  },
  Facebook: {
    color: 'bg-blue-700 text-white border-blue-600',
    pillBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    barColor: 'bg-blue-700',
    description: 'Facebook page, messenger & group links',
  },
  'X (Twitter)': {
    color: 'bg-slate-800 text-white border-slate-700',
    pillBg: 'bg-slate-100 text-slate-800 border-slate-300',
    barColor: 'bg-slate-800',
    description: 'Twitter / X posts and direct links',
  },
  'Direct / Browser': {
    color: 'bg-slate-700 text-white border-slate-600',
    pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
    barColor: 'bg-slate-700',
    description: 'Direct URL typing, bookmarks & Chrome/Safari direct',
  },
  'Other Referral': {
    color: 'bg-amber-600 text-white border-amber-500',
    pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
    barColor: 'bg-amber-600',
    description: 'External websites and link aggregators',
  },
};

export const Analytics = () => {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      let res;
      try {
        res = await api.get(`/api/admin/analytics?period=${period}`);
      } catch (e) {
        res = await api.get(`/api/analytics/summary?period=${period}`);
      }
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message || 'Failed to load traffic analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAnalytics(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    totalPageviews: 0,
    uniqueVisitors: 0,
    totalSessions: 0,
    newVisitorsCount: 0,
    returningVisitorsCount: 0,
  };

  const sources = data?.sources || [];
  const devices = data?.devices || [];
  const browsers = data?.browsers || [];
  const topPages = data?.topPages || [];
  const timeline = data?.timeline || [];
  const recentVisits = data?.recentVisits || [];

  // Calculate social media referral share
  const socialVisits = sources
    .filter((s) => ['TikTok', 'Instagram', 'WhatsApp', 'Facebook', 'X (Twitter)'].includes(s.name))
    .reduce((sum, s) => sum + s.count, 0);

  const socialPercentage = summary.totalPageviews > 0
    ? ((socialVisits / summary.totalPageviews) * 100).toFixed(1)
    : 0;

  const maxTimelineViews = Math.max(...timeline.map((t) => t.views || 0), 1);

  return (
    <div className="space-y-3.5 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Traffic &amp; Visitor Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Active
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 max-w-2xl leading-relaxed">
            Real-time tracking of visitors entering the store even without creating an account. Captures referral channels from TikTok, Instagram, WhatsApp, and Google Search.
          </p>
        </div>

        {/* Time Filters & Refresh */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="inline-flex bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 overflow-x-auto">
            {[
              { id: '24h', label: '24h' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                  period === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            title="Refresh traffic data"
            className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin text-brand-green-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchAnalytics()}
            className="underline font-bold text-amber-900 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {/* Total Pageviews */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Views</span>
            <div className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.totalPageviews.toLocaleString()}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium truncate">
            <Layers className="w-3 h-3 text-slate-400 shrink-0" />
            {summary.totalSessions.toLocaleString()} sessions
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Unique People</span>
            <div className="p-1.5 sm:p-2 bg-brand-green-50 text-brand-green-600 rounded-lg sm:rounded-xl">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.uniqueVisitors.toLocaleString()}
          </div>
          <p className="text-[10px] sm:text-[11px] text-brand-green-700 mt-1 flex items-center gap-1 font-semibold truncate">
            <UserCheck className="w-3 h-3 text-brand-green-600 shrink-0" />
            {summary.newVisitorsCount.toLocaleString()} new visitors
          </p>
        </div>

        {/* Social Referral Share */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Social Share</span>
            <div className="p-1.5 sm:p-2 bg-pink-50 text-pink-600 rounded-lg sm:rounded-xl">
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {socialPercentage}%
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium truncate">
            <TrendingUp className="w-3 h-3 text-pink-500 shrink-0" />
            {socialVisits.toLocaleString()} via TikTok, IG &amp; WA
          </p>
        </div>

        {/* Returning Visitors */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Repeat Guests</span>
            <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.returningVisitorsCount.toLocaleString()}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium truncate">
            <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />
            Returning shoppers
          </p>
        </div>
      </div>

      {/* Traffic Sources Breakdown */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-3.5 sm:mb-6">
          <div>
            <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green-600" />
              Traffic Sources (Where Visitors Enter From)
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Identifies traffic from TikTok, Instagram, WhatsApp, Google Search, and Chrome/Browser directly
            </p>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 self-start sm:self-auto">
            {summary.totalPageviews} Total Visits
          </span>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {sources.map((item) => {
            const config = SOURCE_CONFIG[item.name] || SOURCE_CONFIG['Other Referral'];
            return (
              <div
                key={item.name}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black border ${config.pillBg}`}>
                      {item.name}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      {item.percentage}%
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight min-h-[26px]">
                    {config.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
                    <span>{item.count.toLocaleString()} visits</span>
                    <span className="text-slate-400 font-normal">{item.uniqueVisitors} unique</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visitor Timeline & Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-green-600" />
                Visitor Traffic Trend
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Page views and unique visitors over {period}</p>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="h-44 sm:h-48 flex items-center justify-center text-xs text-slate-400">
              No traffic records available for this time range yet.
            </div>
          ) : (
            <div className="h-44 sm:h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
              {timeline.map((point, index) => {
                const heightPercent = Math.max(12, Math.round((point.views / maxTimelineViews) * 100));
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1.5 min-w-[28px] sm:min-w-[32px] group relative"
                  >
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-md">
                      {point.views} views ({point.visitors} visitors)
                    </div>

                    <div className="w-full max-w-[24px] sm:max-w-[28px] bg-slate-100 rounded-t-lg h-32 sm:h-36 flex items-end p-0.5">
                      <div
                        className="w-full bg-brand-green-600 rounded-t-md transition-all duration-300 group-hover:bg-brand-green-700"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 truncate max-w-full">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-2.5">
            <span>Peak: {maxTimelineViews} visits</span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
              <span className="w-2 h-2 bg-brand-green-600 rounded-xs" /> Page Views
            </span>
          </div>
        </div>

        {/* Top Visited Store Pages */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-brand-green-600" />
            Top Visited Pages
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">Pages entered by potential customers</p>

          <div className="space-y-2.5 sm:space-y-3">
            {topPages.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No page records yet</p>
            ) : (
              topPages.map((page, index) => {
                const total = summary.totalPageviews || 1;
                const pagePct = ((page.count / total) * 100).toFixed(0);
                return (
                  <div key={page.path} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[70%] min-w-0">
                      <span className="w-4 text-[10px] font-bold text-slate-400 shrink-0">{index + 1}.</span>
                      <span className="font-mono text-slate-800 truncate font-semibold">
                        {page.path === '/' ? '/ (Home)' : page.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-slate-900">{page.count}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right font-medium">
                        {pagePct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Devices & Browsers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
        {/* Devices */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-brand-green-600" />
            Visitor Devices
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3.5 sm:mb-5">Screen types used to browse the store</p>

          <div className="space-y-3.5">
            {devices.map((d) => {
              const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor;
              return (
                <div key={d.device} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 capitalize">
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      {d.device}
                    </span>
                    <span className="text-slate-900">
                      {d.percentage}% ({d.count} views)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                    <div
                      className="bg-brand-green-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browsers & In-App WebViews */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-brand-green-600" />
            Browsers &amp; In-App WebViews
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3.5 sm:mb-5">
            Including direct TikTok/Instagram/WhatsApp in-app browser views
          </p>

          <div className="space-y-2 sm:space-y-2.5">
            {browsers.map((b) => (
              <div key={b.browser} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  {b.browser}
                </span>
                <span className="font-bold text-slate-900 shrink-0">
                  {b.count} <span className="text-[10px] text-slate-400 font-normal">({b.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Incoming Visitor Stream */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-green-600" />
              Live Incoming Visitor Stream
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Recent people entering your website, whether guest or logged-in account
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            Latest {recentVisits.length} entries
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Visitor Type</th>
                <th className="py-3 px-4">Source Channel</th>
                <th className="py-3 px-4">Page Entered</th>
                <th className="py-3 px-4">Device / Browser</th>
                <th className="py-3 px-4">OS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentVisits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No visitor logs recorded yet in this timeframe.
                  </td>
                </tr>
              ) : (
                recentVisits.map((visit) => {
                  const config = SOURCE_CONFIG[visit.source] || SOURCE_CONFIG['Other Referral'];
                  const visitDate = new Date(visit.createdAt);
                  const timeFormatted = visitDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const dateFormatted = visitDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{timeFormatted}</div>
                        <div className="text-[10px] text-slate-400">{dateFormatted}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {visit.user ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand-green-500" />
                            <span className="font-bold text-slate-900">{visit.user.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                              {visit.user.role}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            <span>{visit.isNewVisitor ? 'New Guest' : 'Returning Guest'}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${config.pillBg}`}>
                          {visit.source}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-[240px]">
                        {(() => {
                          const displayPath = visit.currentPage || visit.path || visit.landingPage || '/';
                          const rawPages = Array.isArray(visit.pagesVisited) && visit.pagesVisited.length > 0
                            ? visit.pagesVisited
                            : [displayPath];
                          const pageCount = visit.pageViewsCount || rawPages.length;

                          return (
                            <>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-slate-900 font-bold text-[11px] truncate max-w-[140px]">
                                  {displayPath === '/' ? '/ (Home)' : displayPath}
                                </span>
                                {pageCount > 1 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    {pageCount} pages
                                  </span>
                                )}
                              </div>
                              {rawPages.length > 1 && (
                                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5 max-w-[220px]">
                                  {rawPages
                                    .map((p) => {
                                      const pStr = typeof p === 'string' ? p : p?.path || '/';
                                      return pStr === '/' ? 'Home' : pStr.replace(/^\//, '');
                                    })
                                    .join(' → ')}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 capitalize">{visit.device}</span>
                        <span className="text-slate-400 ml-1.5">({visit.browser})</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {visit.os}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Feed View (Native App Style Cards) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {recentVisits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No visitor logs recorded yet in this timeframe.
            </div>
          ) : (
            recentVisits.map((visit) => {
              const config = SOURCE_CONFIG[visit.source] || SOURCE_CONFIG['Other Referral'];
              const visitDate = new Date(visit.lastSeenAt || visit.createdAt);
              const timeFormatted = visitDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={visit.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.pillBg}`}>
                      {visit.source}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {timeFormatted}
                    </span>
                  </div>

                  {(() => {
                    const displayPath = visit.currentPage || visit.path || visit.landingPage || '/';
                    const rawPages = Array.isArray(visit.pagesVisited) && visit.pagesVisited.length > 0
                      ? visit.pagesVisited
                      : [displayPath];
                    const pageCount = visit.pageViewsCount || rawPages.length;

                    return (
                      <>
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 max-w-[70%] min-w-0">
                            <span className="font-mono text-slate-900 font-bold truncate">
                              {displayPath === '/' ? '/ (Home)' : displayPath}
                            </span>
                            {pageCount > 1 && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {pageCount} pages
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium capitalize shrink-0">
                            {visit.device} • {visit.browser}
                          </div>
                        </div>

                        {rawPages.length > 1 && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {rawPages
                              .map((p) => {
                                const pStr = typeof p === 'string' ? p : p?.path || '/';
                                return pStr === '/' ? 'Home' : pStr.replace(/^\//, '');
                              })
                              .join(' → ')}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${visit.user ? 'bg-brand-green-500' : 'bg-slate-300'}`} />
                    <span>
                      {visit.user ? `${visit.user.name} (${visit.user.role})` : visit.isNewVisitor ? 'New Anonymous Guest' : 'Returning Guest'}
                    </span>
                    <span>•</span>
                    <span>{visit.os}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
