'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Save,
  FolderOpen,
  Trash2,
  RefreshCw,
  CloudOff,
  Cloud,
  Database,
} from 'lucide-react'
import {
  deleteScreen,
  firestoreEnabled,
  getScreen,
  listScreens,
  saveScreen,
  type ScreenSnapshot,
} from '@/lib/firestore'
import type { RendererState, SignageAction } from '@/signage'

interface StorageTabProps {
  state: RendererState
  dispatch: (a: SignageAction) => void
}

export function StorageTab({ state, dispatch }: StorageTabProps) {
  const [screens, setScreens] = useState<ScreenSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveName, setSaveName] = useState('')
  const [saveId, setSaveId] = useState('')

  const refresh = async () => {
    if (!firestoreEnabled) return
    setLoading(true)
    setError(null)
    try {
      const list = await listScreens()
      setScreens(list.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Auto-load the list once on mount
  useEffect(() => {
    refresh()
  }, [])

  const handleSave = async () => {
    if (!firestoreEnabled) return
    const id = saveId.trim() || `screen-${Date.now()}`
    const name = saveName.trim() || id
    setLoading(true)
    setError(null)
    try {
      const snapshot: ScreenSnapshot = {
        id,
        name,
        state,
        updatedAt: new Date().toISOString(),
      }
      await saveScreen(snapshot)
      setSaveId(id)
      setSaveName(name)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async (id: string) => {
    if (!firestoreEnabled) return
    setLoading(true)
    setError(null)
    try {
      const snapshot = await getScreen(id)
      if (!snapshot) {
        setError(`Screen "${id}" not found`)
        return
      }
      // Replay the loaded state into the renderer via dispatch actions.
      // The order matters: set templates first, then grid, then actors.
      dispatch({ type: 'setStageTemplate', templateId: snapshot.state.stageTemplateId })
      dispatch({ type: 'setBoxTemplate', templateId: snapshot.state.boxTemplateId })
      dispatch({ type: 'setGap', gap: snapshot.state.gap })
      if (snapshot.state.gridModeId === 'custom') {
        dispatch({
          type: 'setCustomGrid',
          rows: snapshot.state.customGrid.rows,
          cols: snapshot.state.customGrid.cols,
          gap: snapshot.state.customGrid.gap,
        })
      } else {
        dispatch({ type: 'setGridMode', modeId: snapshot.state.gridModeId })
      }
      dispatch({ type: 'clear' })
      if (snapshot.state.actors.length > 0) {
        dispatch({
          type: 'addMany',
          actors: snapshot.state.actors.map((a) => ({
            id: a.id,
            content: a.content,
            fullStage: a.fullStage,
            position: a.position,
          })),
        })
      }
      setSaveId(snapshot.id)
      setSaveName(snapshot.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!firestoreEnabled) return
    if (!confirm(`Delete screen "${id}"? This cannot be undone.`)) return
    setLoading(true)
    setError(null)
    try {
      await deleteScreen(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // ── Firestore not configured ─────────────────────────────────────────────
  if (!firestoreEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4" /> Storage
        </div>
        <div className="rounded-lg border border-dashed bg-slate-50 p-6 text-center">
          <CloudOff className="mx-auto h-8 w-8 text-slate-400" />
          <div className="mt-2 text-sm font-medium text-slate-700">
            Firestore not configured
          </div>
          <p className="mt-1 text-xs text-slate-500">
            The renderer works fully without persistence — your actors live
            in memory only.
          </p>
          <p className="mt-3 text-left text-[11px] text-slate-500">
            To enable save/load:
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-left text-[11px] text-slate-600">
            <li>
              Create a Firebase project at{' '}
              <code className="rounded bg-slate-100 px-1">console.firebase.google.com</code>
            </li>
            <li>Add a Web App to get a project ID + API key</li>
            <li>Create a Firestore database in <strong>test mode</strong></li>
            <li>
              Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code> in <code className="rounded bg-slate-100 px-1">.env</code>
            </li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    )
  }

  // ── Firestore configured ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Cloud className="h-4 w-4 text-green-600" /> Firestore Connected
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ── Save current state ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Save Current State
        </Label>
        <div className="space-y-2">
          <div>
            <Label htmlFor="save-id" className="text-[10px] text-slate-500">
              Screen ID (used as Firestore doc id)
            </Label>
            <Input
              id="save-id"
              value={saveId}
              onChange={(e) => setSaveId(e.target.value)}
              placeholder="produce-endcap-01"
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="save-name" className="text-[10px] text-slate-500">
              Display Name
            </Label>
            <Input
              id="save-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Produce Endcap Display"
              className="text-sm"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4" />
            {saveId ? 'Update' : 'Save'} Screen
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Saved screens list ── */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-slate-500">
          Saved Screens ({screens.length})
        </Label>
        {screens.length === 0 ? (
          <div className="rounded-md border border-dashed bg-slate-50 p-4 text-center text-xs text-slate-400">
            No saved screens yet. Save one above.
          </div>
        ) : (
          <ScrollArea className="max-h-72 pr-2">
            <div className="space-y-1.5">
              {screens.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border bg-white p-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="truncate text-xs font-semibold">{s.name}</div>
                    <div className="truncate text-[10px] text-slate-500">
                      {s.id}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                        {s.state.gridModeId}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {s.state.actors.length} actors
                      </span>
                      {s.updatedAt && (
                        <span className="text-[10px] text-slate-400">
                          · {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleLoad(s.id)}
                    disabled={loading}
                    title="Load"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(s.id)}
                    disabled={loading}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
