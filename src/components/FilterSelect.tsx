import React from 'react'

interface Option {
  value: string
  label: string
}

interface Props {
  label?: string
  value: string
  onChange: (val: string) => void
  options: Option[]
  className?: string
}

/** Select 100% responsivo — sem min-w fixo */
export default function FilterSelect({ label, value, onChange, options, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-1 w-full sm:w-44 md:w-52 lg:w-56 ${className}`}>
      {label && (
        <label className="text-[11px] sm:text-xs font-bold uppercase text-text-secondary tracking-wide">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
