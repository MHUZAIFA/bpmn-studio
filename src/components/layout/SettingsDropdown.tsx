'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferencesStore, THEMES, LAYOUTS, PALETTE_POSITIONS, ThemeId, LayoutId, PalettePosition } from '@/stores/preferencesStore';

export function SettingsDropdown() {
  const { theme, layout, palettePosition, setTheme, setLayout, setPalettePosition } = usePreferencesStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'theme' | 'layout'>('theme');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-colors hover:bg-(--accent-light)"
        title="Settings"
      >
        <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl shadow-xl border overflow-hidden"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setTab('theme')}
                className="flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: tab === 'theme' ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === 'theme' ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                Theme
              </button>
              <button
                onClick={() => setTab('layout')}
                className="flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: tab === 'layout' ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === 'layout' ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                Layout
              </button>
            </div>

            {/* Content */}
            <div className="p-3 max-h-80 overflow-y-auto">
              {tab === 'theme' && (
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as ThemeId)}
                      className="rounded-lg p-2.5 text-left transition-all border-2"
                      style={{
                        background: theme === t.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        borderColor: theme === t.id ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-5 h-5 rounded-full border shadow-sm"
                          style={{ background: t.preview, borderColor: 'var(--border)' }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: theme === t.id ? 'var(--accent-text)' : 'var(--text-primary)' }}
                        >
                          {t.name}
                        </span>
                      </div>
                      {/* Mini preview */}
                      <div
                        className="rounded-md overflow-hidden h-8 flex"
                        style={{ border: `1px solid ${t.colors.border}` }}
                      >
                        <div className="w-1/3 h-full" style={{ background: t.colors.bgPrimary }} />
                        <div className="w-2/3 h-full flex flex-col gap-px p-1" style={{ background: t.colors.bgCanvas }}>
                          <div className="flex-1 rounded-sm" style={{ background: t.colors.accent, opacity: 0.3 }} />
                          <div className="flex-1 rounded-sm" style={{ background: t.colors.accent, opacity: 0.15 }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'layout' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Sidebar</p>
                    {LAYOUTS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLayout(l.id as LayoutId)}
                        className="w-full rounded-lg p-3 text-left transition-all border-2 flex items-center gap-3"
                        style={{
                          background: layout === l.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
                          borderColor: layout === l.id ? 'var(--accent)' : 'transparent',
                        }}
                      >
                        <span className="text-xl leading-none">{l.icon}</span>
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: layout === l.id ? 'var(--accent-text)' : 'var(--text-primary)' }}
                          >
                            {l.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {l.description}
                          </p>
                        </div>
                        {layout === l.id && (
                          <svg className="w-4 h-4 ml-auto shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Elements Panel</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PALETTE_POSITIONS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPalettePosition(p.id as PalettePosition)}
                          className="rounded-lg py-2 px-1 text-center transition-all border-2"
                          style={{
                            background: palettePosition === p.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
                            borderColor: palettePosition === p.id ? 'var(--accent)' : 'transparent',
                          }}
                        >
                          <span className="text-base leading-none">{p.icon}</span>
                          <p
                            className="text-[10px] font-medium mt-1"
                            style={{ color: palettePosition === p.id ? 'var(--accent-text)' : 'var(--text-primary)' }}
                          >
                            {p.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
