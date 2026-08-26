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
        className={`flex items-center justify-between gap-2 px-3 py-2 min-w-[160px] bg-gray-800 border rounded text-sm transition-colors cursor-pointer ${
          open ? 'border-blue-500' : 'border-gray-600 hover:border-gray-500'
        } ${selected ? 'text-white' : 'text-gray-500'}`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className={`text-[10px] text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
          {value && (
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
            >
              {placeholder}
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                opt.value === value
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
