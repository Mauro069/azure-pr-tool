import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}

export function Select({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2 px-3 py-2 min-w-[160px] bg-white border text-[13px] transition-colors cursor-pointer ${
          open ? 'border-accent-500' : 'border-neutral-300 hover:border-neutral-400'
        } ${selected ? 'text-neutral-900' : 'text-neutral-500'}`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className={`text-[10px] text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-300 shadow-sm max-h-60 overflow-y-auto">
          {value && (
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-3 py-2 text-[13px] text-neutral-500 hover:bg-neutral-50 cursor-pointer border-b border-neutral-200"
            >
              {placeholder}
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                opt.value === value
                  ? 'bg-accent-50 text-accent-500'
                  : 'text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
