'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  min?: string;
  max?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function fmtDisplay(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[Number(m)-1]?.slice(0,3)} ${y}`;
}

interface DropdownProps {
  anchorRect: DOMRect;
  value: string;
  viewY: number; viewM: number;
  setViewY: (y:number)=>void; setViewM: (m:number)=>void;
  onSelect: (iso:string)=>void;
  onClear: ()=>void;
  onClose: ()=>void;
  min?: string; max?: string;
}

function CalendarDropdown({ anchorRect, value, viewY, viewM, setViewY, setViewM, onSelect, onClear, onClose, min, max }: DropdownProps) {
  const today = new Date();
  const dropRef = useRef<HTMLDivElement>(null);

  // Position: try below, flip above if no room
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const dropH = 340;
  const top = spaceBelow >= dropH + 8 ? anchorRect.bottom + 6 : anchorRect.top - dropH - 6;
  const left = Math.min(anchorRect.left, window.innerWidth - 290);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const prevMonth = () => { if (viewM===0){setViewM(11);setViewY(viewY-1);}else setViewM(viewM-1); };
  const nextMonth = () => { if (viewM===11){setViewM(0);setViewY(viewY+1);}else setViewM(viewM+1); };

  const firstDow   = new Date(viewY, viewM, 1).getDay();
  const daysInMon  = new Date(viewY, viewM+1, 0).getDate();
  const cells: (number|null)[] = [...Array(firstDow).fill(null), ...Array.from({length:daysInMon},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isoOf = (d:number) => `${viewY}-${String(viewM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const isSel = (d:number) => value === isoOf(d);
  const isTod = (d:number) => today.getFullYear()===viewY && today.getMonth()===viewM && today.getDate()===d;
  const isDis = (d:number) => (!!min && isoOf(d)<min) || (!!max && isoOf(d)>max);

  const navBtn: React.CSSProperties = { background:'none', border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 9px', cursor:'pointer', display:'flex', alignItems:'center', lineHeight:1 };
  const selStyle: React.CSSProperties = { border:'1px solid #e5e7eb', borderRadius:6, padding:'3px 6px', fontSize:12, fontWeight:600, color:'#1a1d23', background:'#f9fafb', outline:'none', cursor:'pointer' };

  return createPortal(
    <div ref={dropRef} style={{
      position:'fixed', top, left, zIndex:99999,
      background:'#fff', border:'1px solid #e5e7eb', borderRadius:14,
      boxShadow:'0 12px 40px rgba(0,0,0,0.14)', padding:16, width:284,
    }}>
      {/* Month/Year nav */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button type="button" style={navBtn} onClick={prevMonth}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <select value={viewM} onChange={e=>setViewM(Number(e.target.value))} style={selStyle}>
            {MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}
          </select>
          <select value={viewY} onChange={e=>setViewY(Number(e.target.value))} style={selStyle}>
            {Array.from({length:30},(_,i)=>today.getFullYear()-15+i).map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" style={navBtn} onClick={nextMonth}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
        {DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#9ca3af',padding:'3px 0'}}>{d}</div>)}
      </div>

      {/* Day grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((d,i)=>{
          if (!d) return <div key={`e${i}`}/>;
          const sel=isSel(d), tod=isTod(d), dis=isDis(d);
          return (
            <button type="button" key={d} onClick={()=>!dis&&onSelect(isoOf(d))} disabled={dis} style={{
              border:'none', borderRadius:7, padding:'7px 0', textAlign:'center',
              fontSize:12, fontWeight:sel?700:400, cursor:dis?'default':'pointer',
              background: sel?'#059669': 'transparent',
              color: sel?'#fff': dis?'#d1d5db': tod?'#059669':'#1a1d23',
              outline: tod&&!sel?'2px solid #d1fae5':'none', outlineOffset:'-2px',
              transition:'background 0.1s',
            }}
            onMouseEnter={e=>{if(!sel&&!dis)(e.currentTarget as HTMLElement).style.background='#f0fdf4';}}
            onMouseLeave={e=>{if(!sel&&!dis)(e.currentTarget as HTMLElement).style.background='transparent';}}>
              {d}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{display:'flex',justifyContent:'space-between',marginTop:12,paddingTop:10,borderTop:'1px solid #f3f4f6'}}>
        <button type="button" onClick={()=>{onClear();onClose();}} style={{fontSize:12,color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Clear</button>
        <button type="button" onClick={()=>{ const t=new Date(); setViewY(t.getFullYear()); setViewM(t.getMonth()); onSelect(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`); }} style={{fontSize:12,color:'#059669',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>Today</button>
      </div>
    </div>,
    document.body
  );
}

export default function DatePicker({ value, onChange, placeholder='Select date', style, className, min, max }: DatePickerProps) {
  const today   = new Date();
  const [open, setOpen]     = useState(false);
  const [viewY, setViewY]   = useState(value ? Number(value.split('-')[0]) : today.getFullYear());
  const [viewM, setViewM]   = useState(value ? Number(value.split('-')[1])-1 : today.getMonth());
  const [rect,  setRect]    = useState<DOMRect|null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) { setViewY(Number(value.split('-')[0])); setViewM(Number(value.split('-')[1])-1); }
  }, [value]);

  const openCalendar = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
  }, []);

  const clear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  return (
    <div style={{position:'relative',display:'inline-block'}} className={className}>
      <div ref={triggerRef} onClick={openCalendar} style={{
        display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
        border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px',
        background:'#fff', fontSize:13, color: value?'#1a1d23':'#9ca3af',
        fontWeight: value?600:400, userSelect:'none', whiteSpace:'nowrap',
        minWidth:140, ...style,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={value?'#059669':'#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{flex:1}}>{value ? fmtDisplay(value) : placeholder}</span>
        {value && (
          <span onClick={clear} style={{color:'#9ca3af',fontSize:15,lineHeight:1,padding:'0 2px',cursor:'pointer'}}>×</span>
        )}
      </div>

      {open && rect && (
        <CalendarDropdown
          anchorRect={rect}
          value={value}
          viewY={viewY} viewM={viewM}
          setViewY={setViewY} setViewM={setViewM}
          onSelect={iso=>{onChange(iso);setOpen(false);}}
          onClear={()=>onChange('')}
          onClose={()=>setOpen(false)}
          min={min} max={max}
        />
      )}
    </div>
  );
}
