'use client'

import * as React from 'react'
import { LeftPane } from '@/components/tailor/LeftPane'
import { RightPane } from '@/components/tailor/RightPane'

export default function Home() {
  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
      {/* Top brand bar — slim */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">Tailor Studio</span>
          <span className="text-slate-300">/</span>
          <span>Module 1 · Desktop Ingestion Workspace</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span>16:9 stage · 1920×1080 baseline</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>Sandbox preview</span>
        </div>
      </div>

      {/* Split-pane horizon — 50/50 on desktop */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        <section
          aria-label="Conversational assistant"
          className="min-h-0 border-r border-slate-200"
        >
          <LeftPane />
        </section>
        <section
          aria-label="Interactive live canvas"
          className="min-h-0"
        >
          <RightPane />
        </section>
      </div>
    </main>
  )
}
