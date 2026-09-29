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
  Search,
  MessageCircle,
  Clock,
  Sparkles,
  Compass,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

// Brand-styled badges & colors for traffic sources
const SOURCE_CONFIG = {
  TikTok: {
    color: 'bg-black text-white border-black',
    pillBg: 'bg-slate-900 text-white',
    iconColor: 'text-pink-500',
    barColor: 'bg-slate-900',
    badgeText: 'TikTok',
    description: 'TikTok Bio & In-App Browser traffic',
  },
  Instagram: {
    color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white border-pink-400',
    pillBg: 'bg-pink-50 text-pink-700 border-pink-200',
    iconColor: 'text-pink-600',
    barColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
    badgeText: 'Instagram',
    description: 'Instagram profile link, stories & posts',
  },
  WhatsApp: {
    color: 'bg-emerald-600 text-white border-emerald-500',
    pillBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconColor: 'text-emerald-600',
    barColor: 'bg-emerald-600',
    badgeText: 'WhatsApp',
    description: 'WhatsApp direct broadcast & chat shares',
  },
  'Google Search': {
    color: 'bg-blue-600 text-white border-blue-500',
    pillBg: 'bg-blue-50 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    barColor: 'bg-blue-600',
    badgeText: 'Google Search',
    description: 'Google organic search & Chrome direct queries',
  },
  Facebook: {
    color: 'bg-blue-700 text-white border-blue-600',
    pillBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconColor: 'text-indigo-600',
    barColor: 'bg-blue-700',
    badgeText: 'Facebook',
    description: 'Facebook page, messenger & group links',
  },
  'X (Twitter)': {
    color: 'bg-slate-800 text-white border-slate-700',
    pillBg: 'bg-slate-100 text-slate-800 border-slate-300',
    iconColor: 'text-slate-800',
    barColor: 'bg-slate-800',
    badgeText: 'X (Twitter)',
    description: 'Twitter / X posts and direct links',
  },
  'Direct / Browser': {
    color: 'bg-slate-700 text-white border-slate-600',
    pillBg: 'bg-slate-50 text-slate-700 border-slate-200',
    iconColor: 'text-slate-600',
    barColor: 'bg-slate-700',
    badgeText: 'Direct / Browser',
    description: 'Direct URL typing, bookmarks, or Chrome/Safari direct',
  },
  'Other Referral': {
    color: 'bg-amber-600 text-white border-amber-500',
    pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    barColor: 'bg-amber-600',
    badgeText: 'Other Referral',
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
      // First try /api/admin/analytics, then fallback to /api/analytics/summary
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

  // Periodic live refresh every 30 seconds
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Traffic & Visitor Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Tracking Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Real-time tracking of visitors entering the store even without creating an account. Monitor referral channels from TikTok, Instagram, WhatsApp, and Google Search.
          </p>
        </div>

        {/* Time Filter Controls & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: '24h', label: '24 Hours' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
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
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-green-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchAnalytics()}
            className="underline font-bold text-amber-900 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Highlights Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Pageviews */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Total Views</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.totalPageviews.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <Layers className="w-3 h-3 text-slate-400" />
            {summary.totalSessions.toLocaleString()} unique visitor sessions
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Unique People</span>
            <div className="p-2 bg-brand-green-50 text-brand-green-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.uniqueVisitors.toLocaleString()}
          </div>
          <p className="text-[11px] text-brand-green-700 mt-1 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3 text-brand-green-600" />
            {summary.newVisitorsCount.toLocaleString()} first-time visitors
          </p>
        </div>

        {/* Social Media Traffic */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Social Channels</span>
            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {socialPercentage}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3 text-pink-500" />
            {socialVisits.toLocaleString()} visits from TikTok, IG & WA
          </p>
        </div>

        {/* Returning Visitors */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Repeat Visitors</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {summary.returningVisitorsCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            Returning interested buyers
          </p>
        </div>
      </div>

      {/* Primary Section: Traffic Source Breakdown */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-green-600" />
              Where Visitors Are Coming From (Traffic Sources)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of external channels driving potential customers into your store
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 self-start sm:self-auto">
            {summary.totalPageviews} Total Visits Recorded
          </span>
        </div>

        {/* Sources Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sources.map((item) => {
            const config = SOURCE_CONFIG[item.name] || SOURCE_CONFIG['Other Referral'];
            return (
              <div
                key={item.name}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${config.pillBg}`}>
                      {item.name}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {item.percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight min-h-[28px]">
                    {config.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>{item.count.toLocaleString()} visits</span>
                    <span className="text-slate-400 font-normal">{item.uniqueVisitors} unique</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
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

      {/* Traffic Trend Over Time & Top Landing Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-green-600" />
                Visitor Traffic Trend
              </h3>
              <p className="text-xs text-slate-500">Page views and distinct visitors over {period}</p>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No traffic records available for this time range yet.
            </div>
          ) : (
            <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
              {timeline.map((point, index) => {
                const heightPercent = Math.max(12, Math.round((point.views / maxTimelineViews) * 100));
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2 min-w-[32px] group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                      {point.views} views ({point.visitors} visitors)
                    </div>

                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg h-36 flex items-end p-0.5">
                      <div
                        className="w-full bg-brand-green-600 rounded-t-md transition-all duration-300 group-hover:bg-brand-green-700"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-full">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3">
            <span>Volume scale: 0 to {maxTimelineViews} visits</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 bg-brand-green-600 rounded-xs" /> Page Views
              </span>
            </div>
          </div>
        </div>

        {/* Top Visited Store Pages */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-brand-green-600" />
            Top Landing Pages
          </h3>
          <p className="text-xs text-slate-500 mb-4">Most visited paths by entered customers</p>

          <div className="space-y-3">
            {topPages.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No page records yet</p>
            ) : (
              topPages.map((page, index) => {
                const total = summary.totalPageviews || 1;
                const pagePct = ((page.count / total) * 100).toFixed(0);
                return (
                  <div key={page.path} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <span className="w-5 text-[11px] font-bold text-slate-400">{index + 1}.</span>
                      <span className="font-mono text-slate-800 truncate font-semibold">
                        {page.path === '/' ? '/ (Home)' : page.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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

      {/* Devices & Browsers Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Devices */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-brand-green-600" />
            Customer Devices
          </h3>
          <p className="text-xs text-slate-500 mb-5">Screen types used to browse the store</p>

          <div className="space-y-4">
            {devices.map((d) => {
              const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor;
              return (
                <div key={d.device} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 capitalize">
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      {d.device}
                    </span>
                    <span className="text-slate-900">
                      {d.percentage}% ({d.count} views)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-green-600 h-full rounded-full"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browsers & In-App WebViews */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-brand-green-600" />
            Browsers & In-App Browsers
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Including direct TikTok/Instagram/WhatsApp in-app web views
          </p>

          <div className="space-y-3">
            {browsers.map((b) => (
              <div key={b.browser} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  {b.browser}
                </span>
                <span className="font-bold text-slate-900">
                  {b.count} <span className="text-[11px] text-slate-400 font-normal">({b.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Visitor Live Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-green-600" />
              Live Incoming Visitor Stream
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent people entering your website, whether guest or logged-in account
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Showing latest {recentVisits.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
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
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${config.pillBg}`}>
                          {visit.source}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-800 max-w-[180px] truncate">
                        {visit.path}
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
      </div>
    </div>
  );
};

export default Analytics;
