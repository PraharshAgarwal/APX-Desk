import Link from 'next/link';
import { IconArrowUp, IconArrowDown } from '@/components/ui/Icons';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: string;
  accentColor?: 'green' | 'amber' | 'blue' | 'red' | 'violet';
  /** When set, the entire card becomes a navigation link */
  href?: string;
}

const ICON_BG: Record<string, string> = {
  green: '#ecfdf5', amber: '#fffbeb', blue: '#eff6ff', red: '#fef2f2', violet: '#f5f3ff',
};
const ICON_COLOR: Record<string, string> = {
  green: '#059669', amber: '#d97706', blue: '#2563eb', red: '#dc2626', violet: '#7c3aed',
};

function CardInner({ label, value, change, changeType, icon, accentColor = 'green' }: Omit<StatCardProps, 'href'>) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: ICON_BG[accentColor], color: ICON_COLOR[accentColor],
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            border: `1px solid ${ICON_BG[accentColor]}`,
          }}>{icon}</div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#1a1d23', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {change && (
        <div style={{
          marginTop: 8, fontSize: 12, fontWeight: 600,
          color: changeType === 'up' ? '#059669' : changeType === 'down' ? '#dc2626' : '#6b7280',
        }}>
          {changeType === 'up' ? <><IconArrowUp size={9} /> </> : changeType === 'down' ? <><IconArrowDown size={9} /> </> : ''}{change}
        </div>
      )}
    </>
  );
}

export default function StatCard({ href, accentColor = 'green', ...rest }: StatCardProps) {
  const className = `stat-card ${accentColor}`;
  const linkStyle: React.CSSProperties = {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        style={linkStyle}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = '';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
        }}
      >
        <CardInner accentColor={accentColor} {...rest} />
      </Link>
    );
  }

  return (
    <div className={className}>
      <CardInner accentColor={accentColor} {...rest} />
    </div>
  );
}
