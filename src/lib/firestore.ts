/**
 * Firestore REST API helper
 * =========================
 *
 * A minimal, zero-dependency Firestore client that uses only the public
 * REST API (https://firestore.googleapis.com). No Firebase SDK, no admin
 * credentials — perfect for testing with the "test mode" security rules
 * that allow public read/write for 30 days.
 *
 * Setup:
 *   1. Create a Firebase project at https://console.firebase.google.com
 *   2. Add a Web App to get the project ID + Web API key
 *   3. Create a Cloud Firestore database in test mode (public R/W)
 *   4. Set the env vars in .env (all NEXT_PUBLIC_ so they reach the browser):
 *        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
 *        NEXT_PUBLIC_FIRESTORE_API_KEY=your-web-api-key      (optional)
 *        NEXT_PUBLIC_FIRESTORE_COLLECTION=screens             (optional, default)
 *
 * If NEXT_PUBLIC_FIREBASE_PROJECT_ID is unset, all calls return null
 * and the renderer keeps running with in-memory state only.
 */

import type { RendererState } from '@/signage'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''
const API_KEY = process.env.NEXT_PUBLIC_FIRESTORE_API_KEY ?? ''
const COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_COLLECTION || 'screens'

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export const firestoreEnabled = Boolean(PROJECT_ID)

/** A snapshot of a screen's renderer state, with metadata. */
export interface ScreenSnapshot {
  id: string
  state: RendererState
  name: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — Firestore's REST API wraps fields in type objects
// (e.g. { stringValue: "hello" }), so we marshal/unmarshal.
// ─────────────────────────────────────────────────────────────────────────────

function encode(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((v) => encode(v)),
      },
    }
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as object).map(([k, v]) => [k, encode(v)]),
        ),
      },
    }
  }
  return { nullValue: null }
}

function decode(field: Record<string, unknown>): unknown {
  if ('nullValue' in field) return null
  if ('stringValue' in field) return field.stringValue
  if ('integerValue' in field) return Number(field.integerValue)
  if ('doubleValue' in field) return Number(field.doubleValue)
  if ('booleanValue' in field) return field.booleanValue
  if ('arrayValue' in field) {
    const arr = (field.arrayValue as { values?: unknown[] }).values ?? []
    return arr.map((v) => decode(v as Record<string, unknown>))
  }
  if ('mapValue' in field) {
    const fields =
      (field.mapValue as { fields?: Record<string, unknown> }).fields ?? {}
    return Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [
        k,
        decode(v as Record<string, unknown>),
      ]),
    )
  }
  return null
}

function authQuery(): string {
  return API_KEY ? `?key=${encodeURIComponent(API_KEY)}` : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** List all saved screen snapshots in the Firestore collection. */
export async function listScreens(): Promise<ScreenSnapshot[]> {
  if (!firestoreEnabled) return []
  const res = await fetch(`${BASE}/${COLLECTION}${authQuery()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Firestore listScreens failed: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  const docs: unknown[] = data.documents ?? []
  return docs.map((doc) => parseDoc(doc as FirestoreDoc))
}

/** Load a single screen snapshot by ID. Returns null if not found. */
export async function getScreen(id: string): Promise<ScreenSnapshot | null> {
  if (!firestoreEnabled) return null
  const res = await fetch(`${BASE}/${COLLECTION}/${id}${authQuery()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Firestore getScreen failed: ${res.status} ${await res.text()}`)
  }
  return parseDoc(await res.json())
}

/** Save (upsert) a screen snapshot by ID. */
export async function saveScreen(snapshot: ScreenSnapshot): Promise<void> {
  if (!firestoreEnabled) {
    throw new Error('Firestore not configured — set NEXT_PUBLIC_FIREBASE_PROJECT_ID')
  }
  const fields = {
    name: encode(snapshot.name),
    state: encode(snapshot.state),
    updatedAt: encode(snapshot.updatedAt),
  }
  const res = await fetch(`${BASE}/${COLLECTION}/${snapshot.id}${authQuery()}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    throw new Error(`Firestore saveScreen failed: ${res.status} ${await res.text()}`)
  }
}

/** Delete a screen snapshot by ID. */
export async function deleteScreen(id: string): Promise<void> {
  if (!firestoreEnabled) return
  const res = await fetch(`${BASE}/${COLLECTION}/${id}${authQuery()}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore deleteScreen failed: ${res.status} ${await res.text()}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal — parse a Firestore document into a ScreenSnapshot
// ─────────────────────────────────────────────────────────────────────────────

interface FirestoreDoc {
  name: string
  fields: Record<string, unknown>
}

function parseDoc(doc: FirestoreDoc): ScreenSnapshot {
  // doc.name is like ".../documents/screens/MY_ID"
  const id = doc.name.split('/').pop() ?? ''
  const fields = doc.fields ?? {}
  return {
    id,
    name: String(decode(fields.name as Record<string, unknown>) ?? id),
    state: decode(fields.state as Record<string, unknown>) as RendererState,
    updatedAt: String(decode(fields.updatedAt as Record<string, unknown>) ?? ''),
  }
}
