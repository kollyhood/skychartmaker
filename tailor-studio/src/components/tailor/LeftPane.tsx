'use client'

import * as React from 'react'
import { useTailor } from '@/lib/tailor/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Bot,
  User,
  Upload,
  Sparkles,
  Rocket,
  RefreshCw,
  Type,
  Grid3x3,
  Loader2,
} from 'lucide-react'

const STAGE_STEPS = [
  { key: 'idle', label: 'Upload' },
  { key: 'override', label: 'Draw' },
  { key: 'publishing', label: 'Publish' },
  { key: 'published', label: 'Deployed' },
] as const

function stageIndex(stage: string): number {
  switch (stage) {
    case 'idle':
    case 'uploading':
      return 0
    case 'override':
      return 1
    case 'publishing':
      return 2
    case 'published':
      return 3
    default:
      return 0
  }
}

export function LeftPane() {
  const chat = useTailor((s) => s.chat)
  const stage = useTailor((s) => s.stage)
  const reset = useTailor((s) => s.reset)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const currentStep = stageIndex(stage)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat.length])

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-white to-slate-50">
      {/* Brand header */}
      <header className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-900">The Tailor</div>
            <div className="text-[11px] text-slate-500">Desktop Ingestion Workspace</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
          onClick={reset}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </header>

      {/* Stage progress rail */}
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-3">
        <div className="flex items-center gap-1.5">
          {STAGE_STEPS.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors',
                      done && 'bg-primary text-primary-foreground',
                      active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                      !done && !active && 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      active ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STAGE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px flex-1',
                      i < currentStep ? 'bg-primary' : 'bg-slate-200',
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-4 px-5 py-5">
          {chat.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {stage === 'analyzing' && <AnalyzingIndicator />}
          {stage === 'publishing' && <PublishingIndicator />}
        </div>
      </div>

      {/* Live progress strip */}
      <ProgressStrip />

      {/* Status / context footer */}
      <ContextFooter />
    </div>
  )
}

function ChatBubble({ message }: { message: ReturnType<typeof useTailor.getState>['chat'][number] }) {
  const isAssistant = message.role === 'assistant'
  return (
    <div className={cn('flex gap-2.5', !isAssistant && 'flex-row-reverse')}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            'text-[10px] font-medium',
            isAssistant ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600',
          )}
        >
          {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm',
          isAssistant
            ? 'rounded-tl-sm bg-white text-slate-700 ring-1 ring-slate-200/80'
            : 'rounded-tr-sm bg-primary text-primary-foreground',
        )}
      >
        {message.content}
        {message.cta && (
          <CtaChip label={message.cta.label} action={message.cta.action} />
        )}
      </div>
    </div>
  )
}

function CtaChip({ label, action }: { label: string; action: string }) {
  const triggerUpload = useTailorAction(action)
  return (
    <button
      onClick={triggerUpload}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/20 transition hover:bg-primary/15"
    >
      {label}
    </button>
  )
}

function useTailorAction(action: string) {
  const stage = useTailor((s) => s.stage)
  return React.useCallback(() => {
    // Most CTAs just nudge the user's attention; the actual action lives on the canvas.
    // We scroll the right pane into view if needed.
    const canvas = document.getElementById('tailor-canvas-shell')
    if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [stage, action])
}

function AnalyzingIndicator() {
  const progress = useTailor((s) => s.progress)
  return (
    <div className="flex gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 text-[13px] text-slate-600 ring-1 ring-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
          </div>
          <div className="flex flex-col gap-0.5 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Grid3x3 className="h-3 w-3" />
              {progress || 'Running ingestion engine…'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PublishingIndicator() {
  const progress = useTailor((s) => s.progress)
  return (
    <div className="flex gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 text-[13px] text-slate-600 ring-1 ring-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <Rocket className="h-3 w-3" />
            {progress || 'Publishing stage…'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ContextFooter() {
  const stage = useTailor((s) => s.stage)
  const houses = useTailor((s) => s.houses)
  const fonts = useTailor((s) => s.detectedFonts)

  let summary: React.ReactNode = null
  if (stage === 'idle' || stage === 'uploading') {
    summary = (
      <span className="flex items-center gap-1.5 text-slate-500">
        <Upload className="h-3 w-3" /> Waiting for upload
      </span>
    )
  } else if (stage === 'analyzing') {
    summary = <span className="text-slate-500">Running ingestion engine…</span>
  } else if (stage === 'override' || stage === 'publishing') {
    summary = (
      <div className="flex items-center gap-3 text-slate-600">
        <span className="flex items-center gap-1.5">
          <Grid3x3 className="h-3 w-3" />
          {houses.length} houses
        </span>
        <span className="flex items-center gap-1.5">
          <Type className="h-3 w-3" />
          {fonts.length} typefaces
        </span>
      </div>
    )
  } else if (stage === 'published') {
    summary = <span className="text-primary">Stage deployed to screen network</span>
  }

  return (
    <footer className="border-t border-slate-200/80 bg-white px-5 py-3 text-[11px]">
      {summary}
    </footer>
  )
}

function ProgressStrip() {
  const progress = useTailor((s) => s.progress)
  const stage = useTailor((s) => s.stage)
  if (!progress) return null
  if (stage !== 'analyzing' && stage !== 'publishing') return null
  return (
    <div className="flex items-center gap-2 border-t border-slate-200/80 bg-slate-50 px-5 py-2 text-[11px] text-slate-600">
      <Loader2 className="h-3 w-3 animate-spin text-primary" />
      <span className="font-mono">{progress}</span>
    </div>
  )
}
