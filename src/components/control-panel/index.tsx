'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wifi, WifiOff, Users, Grid2x2, Palette, Code2, Sparkles, Database } from 'lucide-react'
import type { RendererState, SignageAction, SignagePayload } from '@/signage'
import { ActorsTab } from './actors-tab'
import { GridTab } from './grid-tab'
import { TemplatesTab } from './templates-tab'
import { JsonTab } from './json-tab'
import { StorageTab } from './storage-tab'

interface ControlPanelProps {
  state: RendererState
  dispatch: (a: SignageAction) => void
  log: { ts: number; payload: SignagePayload }[]
  wsConnected: boolean
  wsClientCount: number
}

export function ControlPanel({
  state,
  dispatch,
  log,
  wsConnected,
  wsClientCount,
}: ControlPanelProps) {
  const [tab, setTab] = useState('actors')

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Control Panel</CardTitle>
          <Badge variant={wsConnected ? 'default' : 'secondary'} className="gap-1">
            {wsConnected ? (
              <>
                <Wifi className="h-3 w-3" /> Live
                {wsClientCount > 0 && (
                  <span className="ml-1 flex items-center gap-0.5">
                    <Users className="h-3 w-3" /> {wsClientCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" /> Local
              </>
            )}
          </Badge>
        </div>
        <CardDescription>
          Add/update/remove actors, switch grids, swap templates.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
          <TabsList className="mx-4 grid grid-cols-5">
            <TabsTrigger value="actors" className="gap-1 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Actors
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1 text-xs">
              <Grid2x2 className="h-3.5 w-3.5" /> Grid
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1 text-xs">
              <Palette className="h-3.5 w-3.5" /> Style
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-1 text-xs">
              <Database className="h-3.5 w-3.5" /> Save
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1 text-xs">
              <Code2 className="h-3.5 w-3.5" /> JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actors" className="mt-0 flex-1 overflow-y-auto p-4">
            <ActorsTab state={state} dispatch={dispatch} />
          </TabsContent>

          <TabsContent value="grid" className="mt-0 flex-1 overflow-y-auto p-4">
            <GridTab state={state} dispatch={dispatch} />
          </TabsContent>

          <TabsContent value="templates" className="mt-0 flex-1 overflow-y-auto p-4">
            <TemplatesTab state={state} dispatch={dispatch} />
          </TabsContent>

          <TabsContent value="storage" className="mt-0 flex-1 overflow-y-auto p-4">
            <StorageTab state={state} dispatch={dispatch} />
          </TabsContent>

          <TabsContent value="json" className="mt-0 flex-1 overflow-y-auto p-4">
            <JsonTab dispatch={dispatch} log={log} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
