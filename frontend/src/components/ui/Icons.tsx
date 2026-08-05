/**
 * Shared SVG icon silhouettes — replaces all emoji usage site-wide.
 * All icons use stroke-only paths for a clean, consistent appearance.
 */

import React from 'react';

export const IconX = ({ size = 10, strokeWidth = 1.6, className }: { size?: number; strokeWidth?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
  </svg>
);

export const IconWarning = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M7 1.5L12.8 12H1.2L7 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M7 5.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="7" cy="10.5" r="0.7" fill="currentColor"/>
  </svg>
);

export const IconDownload = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M6 1.5V8M3 5.5L6 8 9 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.5 10.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IconArrowUp = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M5 8V2M2.5 4.5L5 2 7.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconArrowDown = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M5 2V8M2.5 5.5L5 8 7.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconCheck = ({ size = 12, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M2 6.5L4.5 9L10 3" stroke={color || 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconFinance = ({ size = 15, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <circle cx="8" cy="8" r="6.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M8 3.5V12.5" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M5.5 5.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3H10" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IconFactory = ({ size = 15, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M1 14V9L5.5 6.5V9L10 6.5V14" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <rect x="10" y="9" width="5" height="5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M1 14H15" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M3 11.5V14M6.5 11.5V14" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IconStore = ({ size = 15, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M2 7H14M3.5 7L4.5 2H11.5L12.5 7" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M2 7V14H14V7" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <rect x="6" y="10" width="4" height="4" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M2 7Q2 9.5 4 9.5t2-2.5M8 7Q8 9.5 10 9.5t2-2.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
  </svg>
);

export const IconPackage = ({ size = 15, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M8 1.5L14 5V11L8 14.5L2 11V5L8 1.5Z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M2 5L8 8.5M14 5L8 8.5M8 8.5V14.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M5 3.3L11 6.8" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IconClipboard = ({ size = 15, color }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <rect x="3" y="3" width="10" height="12" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M6 3V2h4v1" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M5.5 7h5M5.5 10h5M5.5 13h3" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

// ── Sidebar / Navigation icons ────────────────────────────────

const SvgBase = ({ size, children }: { size: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    {children}
  </svg>
);

const IconDashboard  = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
  </SvgBase>
);

const IconAnalytics = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M1.5 14.5h13" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <rect x="2" y="9" width="2.5" height="5.5" rx="0.5" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <rect x="6.5" y="5.5" width="2.5" height="9" rx="0.5" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <rect x="11" y="2" width="2.5" height="12.5" rx="0.5" stroke={color || 'currentColor'} strokeWidth="1.2"/>
  </SvgBase>
);

const IconProducts = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M1.5 4.5L8 1.5L14.5 4.5V11.5L8 14.5L1.5 11.5V4.5Z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M1.5 4.5L8 7.5M14.5 4.5L8 7.5M8 7.5V14.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
  </SvgBase>
);

const IconInventory = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <rect x="2" y="6" width="12" height="8.5" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M2 9.5h12" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <path d="M5 6V3.5a3 3 0 016 0V6" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M6 12h4" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round"/>
  </SvgBase>
);

const IconReports = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <rect x="3" y="1.5" width="10" height="13" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M10 10.5l1.5 1.5 2-2.5" stroke={color || 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

const IconAdmin = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="5.5" r="3" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

const IconSettings = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="8" r="2.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
      stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

const IconLogOut = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M6 2.5H3a1 1 0 00-1 1v9a1 1 0 001 1h3" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M10.5 11L14 8l-3.5-3" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 8H6" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

// ── Login page icons ─────────────────────────────────────────

const IconShield = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M8 1.5L14 4v5c0 3.5-2.5 5.8-6 7-3.5-1.2-6-3.5-6-7V4L8 1.5Z"
      stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 8l2 2L11 6" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

const IconBriefcase = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <rect x="1.5" y="5.5" width="13" height="9" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M5.5 5.5V4a2.5 2.5 0 015 0v1.5" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M1.5 10h13" stroke={color || 'currentColor'} strokeWidth="1.2"/>
  </SvgBase>
);

// ── Utility / widget icons ────────────────────────────────────

const IconSearch = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="7" cy="7" r="4.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M10.5 10.5L14 14" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round"/>
  </SvgBase>
);

const IconWrench = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M13.5 2.5a3.5 3.5 0 00-4.9 4.9L2 14a1 1 0 001.4 1.4l6.6-6.6a3.5 3.5 0 004.9-4.9l-2.1 2.1-1.4-1.4 2.1-2.1z"
      stroke={color || 'currentColor'} strokeWidth="1.2" strokeLinejoin="round"/>
  </SvgBase>
);

const IconUsers = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="6" cy="5" r="2.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M1 14c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="12" cy="5" r="2" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <path d="M14.5 14c0-2.2-1.3-3.5-3-3.8" stroke={color || 'currentColor'} strokeWidth="1.2" strokeLinecap="round"/>
  </SvgBase>
);

const IconAlertTriangle = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M8 1.5L15 13.5H1L8 1.5Z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M8 6V9.5" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="11.5" r="0.7" fill={color || 'currentColor'}/>
  </SvgBase>
);

const IconAlertCircle = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="8" r="6.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M8 5V8.5" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="10.8" r="0.7" fill={color || 'currentColor'}/>
  </SvgBase>
);

const IconCreditCard = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M1.5 7h13" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M4 10.5h3" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round"/>
  </SvgBase>
);

const IconTruck = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M1 3h9v8H1V3z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M10 6h2.5L15 9v2h-5V6z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="3.5" cy="11.5" r="1.2" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <circle cx="12" cy="11.5" r="1.2" stroke={color || 'currentColor'} strokeWidth="1.2"/>
  </SvgBase>
);

const IconClock = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="8" r="6.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M8 4.5V8l2.5 2" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

// ── Remaining icon components (must be defined before Icons object) ──

const IconBell = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M8 2a4.5 4.5 0 014.5 4.5c0 2.5.5 4 1.5 5H2c1-1 1.5-2.5 1.5-5A4.5 4.5 0 018 2z"
      stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M6.5 14a1.5 1.5 0 003 0" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

const IconCheckCircle = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="8" r="6.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M5 8.5l2 2L11 6" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

const IconChevronRight = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M6 3.5L10.5 8 6 12.5" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

const IconBuilding = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <rect x="2" y="2" width="12" height="13" rx="1" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M2 6h12" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <path d="M5.5 9.5h1.5M9 9.5h1.5M5.5 12.5h1.5M9 12.5h1.5" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M6.5 15V11h3v4" stroke={color || 'currentColor'} strokeWidth="1.2" strokeLinejoin="round"/>
  </SvgBase>
);

const IconPlus = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M8 2.5V13.5M2.5 8H13.5" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
  </SvgBase>
);

const IconEdit = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M11 2.5l2.5 2.5-8.5 8.5H2.5V11L11 2.5z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M9.5 4l2.5 2.5" stroke={color || 'currentColor'} strokeWidth="1.2"/>
  </SvgBase>
);

const IconTrash = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M2.5 4.5h11M10 4.5V3h-4v1.5M4.5 4.5l.8 9h5.4l.8-9" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

const IconScale = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M8 2v12M3 14h10" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M3 5.5L1.5 9.5h3L3 5.5zM13 5.5L11.5 9.5h3L13 5.5z" stroke={color || 'currentColor'} strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M3 5.5h10" stroke={color || 'currentColor'} strokeWidth="1.2" strokeLinecap="round"/>
  </SvgBase>
);

const IconTag = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="5.5" cy="5.5" r="1" fill={color || 'currentColor'}/>
  </SvgBase>
);

const IconTarget = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="8" r="6.5" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <circle cx="8" cy="8" r="3.5" stroke={color || 'currentColor'} strokeWidth="1.2"/>
    <circle cx="8" cy="8" r="1" fill={color || 'currentColor'}/>
    <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

const IconLeaf = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M3 13c2-5 4-9 10-10C13 9 9 12 3 13z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M3 13L7 9" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

const IconUser = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <circle cx="8" cy="5.5" r="3" stroke={color || 'currentColor'} strokeWidth="1.3"/>
    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
  </SvgBase>
);

const IconMapPin = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M8 1.5A4.5 4.5 0 0112.5 6c0 3-4.5 8.5-4.5 8.5S3 9 3 6A4.5 4.5 0 018 1.5z" stroke={color || 'currentColor'} strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="6" r="1.5" stroke={color || 'currentColor'} strokeWidth="1.2"/>
  </SvgBase>
);

const IconTrendingUp = ({ size = 16, color }: { size?: number; color?: string }) => (
  <SvgBase size={size}>
    <path d="M1.5 11.5L6 7l3 3 5.5-6" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 4.5H15v4.5" stroke={color || 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </SvgBase>
);

// ── Icons namespace — used by Sidebar.tsx, Topbar, Dashboards ─
// Provides Icons.Dashboard, Icons.LogOut etc. as a single import.

export const Icons = {
  Dashboard:     IconDashboard,
  Analytics:     IconAnalytics,
  Orders:        IconClipboard,
  Store:         IconStore,
  Products:      IconProducts,
  Inventory:     IconInventory,
  Warehouse:     IconFactory,
  Finance:       IconFinance,
  Reports:       IconReports,
  Admin:         IconAdmin,
  Settings:      IconSettings,
  Package:       IconPackage,
  LogOut:        IconLogOut,
  Shield:        IconShield,
  Briefcase:     IconBriefcase,
  Search:        IconSearch,
  Wrench:        IconWrench,
  Users:         IconUsers,
  AlertTriangle: IconAlertTriangle,
  AlertCircle:   IconAlertCircle,
  CreditCard:    IconCreditCard,
  Truck:         IconTruck,
  Clipboard:     IconClipboard,
  Clock:         IconClock,
  Bell:          IconBell,
  CheckCircle:   IconCheckCircle,
  ChevronRight:  IconChevronRight,
  Building:      IconBuilding,
  Plus:          IconPlus,
  Edit:          IconEdit,
  Trash:         IconTrash,
  Scale:         IconScale,
  Tag:           IconTag,
  Target:        IconTarget,
  Leaf:          IconLeaf,
  User:          IconUser,
  MapPin:        IconMapPin,
  TrendingUp:    IconTrendingUp,
};
