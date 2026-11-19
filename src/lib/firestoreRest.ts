import fs from 'fs';
import path from 'path';

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
  apiKey: string;
}

const DEFAULT_FIREBASE_CONFIG: FirebaseAppletConfig = {
  projectId: 'gen-lang-client-0325240090',
  firestoreDatabaseId: 'ai-studio-tripseatourphuke-9bf47128-91ee-4d53-a5c2-4dd34a872beb',
  apiKey: 'AIzaSyCkRR0AgpyLbzxbSZ_1tmQyPq0pP4hjslI',
};

function loadFirebaseConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch {
    // Fallback to provisioned public web config
  }
  return DEFAULT_FIREBASE_CONFIG;
}

const firebaseConfig = loadFirebaseConfig();

export const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';
const API_KEY = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function toFirestoreValue(val: any): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function fromFirestoreValue(fv: any): any {
  if (!fv || typeof fv !== 'object') return null;
  if ('nullValue' in fv) return null;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('integerValue' in fv) return Number(fv.integerValue);
  if ('doubleValue' in fv) return Number(fv.doubleValue);
  if ('stringValue' in fv) return fv.stringValue;
  if ('timestampValue' in fv) return fv.timestampValue;
  if ('arrayValue' in fv) {
    return Array.isArray(fv.arrayValue?.values)
      ? fv.arrayValue.values.map((v: any) => fromFirestoreValue(v))
      : [];
  }
  if ('mapValue' in fv) {
    const out: Record<string, any> = {};
    const fields = fv.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

export function fromFirestoreDoc<T = Record<string, any>>(doc: any): T | null {
  if (!doc || !doc.fields) return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out as T;
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function buildHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken && authToken.trim()) {
    headers.Authorization = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }
  return headers;
}

export async function fsGetDoc<T = any>(
  collectionName: string,
  docId: string,
  authToken?: string
): Promise<{ exists: boolean; data: T | null; status: number }> {
  try {
    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(authToken),
      cache: 'no-store',
    });
    if (res.status === 404) {
      return { exists: false, data: null, status: 404 };
    }
    if (!res.ok) {
      return { exists: false, data: null, status: res.status };
    }
    const raw = await res.json();
    return { exists: true, data: fromFirestoreDoc<T>(raw), status: res.status };
  } catch {
    return { exists: false, data: null, status: 0 };
  }
}

export async function fsSetDoc(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  authToken?: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildHeaders(authToken),
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: errText };
    }
    return { ok: true, status: res.status };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function fsPatchFields(
  collectionName: string,
  docId: string,
  partialData: Record<string, any>,
  authToken?: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const fieldKeys = Object.keys(partialData).filter((k) => partialData[k] !== undefined);
    if (fieldKeys.length === 0) return { ok: true, status: 200 };
    const maskParams = fieldKeys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?${maskParams}&key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildHeaders(authToken),
      body: JSON.stringify({ fields: toFirestoreFields(partialData) }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: errText };
    }
    return { ok: true, status: res.status };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

export async function fsDeleteDoc(
  collectionName: string,
  docId: string,
  authToken?: string
): Promise<boolean> {
  try {
    const url = `${BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(authToken),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function fsListCollection<T = any>(
  collectionName: string,
  authToken?: string,
  pageSize: number = 100
): Promise<{ ok: boolean; items: T[]; status: number }> {
  try {
    const items: T[] = [];
    let pageToken = '';
    do {
      const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const url = `${BASE_URL}/${encodeURIComponent(collectionName)}?pageSize=${pageSize}${tokenParam}&key=${encodeURIComponent(API_KEY)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(authToken),
        cache: 'no-store',
      });
      if (!res.ok) {
        return { ok: false, items: [], status: res.status };
      }
      const json: any = await res.json();
      if (Array.isArray(json.documents)) {
        for (const doc of json.documents) {
          const parsed = fromFirestoreDoc<T>(doc);
          if (parsed) items.push(parsed);
        }
      }
      pageToken = json.nextPageToken || '';
    } while (pageToken);

    return { ok: true, items, status: 200 };
  } catch {
    return { ok: false, items: [], status: 0 };
  }
}

export async function fsQueryVisible<T = any>(
  collectionName: string,
  fieldPath: string,
  boolValue: boolean,
  authToken?: string
): Promise<{ ok: boolean; items: T[]; status: number }> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents:runQuery?key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: { booleanValue: boolValue },
            },
          },
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, items: [], status: res.status };
    }
    const rows: any[] = await res.json();
    const items: T[] = [];
    for (const row of rows) {
      if (row.document) {
        const parsed = fromFirestoreDoc<T>(row.document);
        if (parsed) items.push(parsed);
      }
    }
    return { ok: true, items, status: 200 };
  } catch {
    return { ok: false, items: [], status: 0 };
  }
}
