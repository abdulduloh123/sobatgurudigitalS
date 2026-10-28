import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { firebaseAuth, firestore } from '../_lib/clients.js'

const scrypt = promisify(scryptCallback)
const APP_ID = process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'
const users = () => firestore.collection(`artifacts/${APP_ID}/public/data/usersData`)
const credentials = () => firestore.collection('internalAuth')
const HASH_BYTES = 64

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, HASH_BYTES) as Buffer
  return { salt, passwordHash: hash.toString('hex') }
}

async function matchesPassword(password: string, salt: unknown, passwordHash: unknown) {
  if (typeof salt !== 'string' || typeof passwordHash !== 'string' || !/^[a-f\d]{128}$/i.test(passwordHash)) return false
  const actual = await scrypt(password, salt, HASH_BYTES) as Buffer
  const expected = Buffer.from(passwordHash, 'hex')
  return expected.length === actual.length && timingSafeEqual(actual, expected)
}

/** One-time migration: hash legacy passwords and remove them from browser-readable staff records. */
async function migrateLegacyPasswords(accountDocs: QueryDocumentSnapshot[]) {
  const legacy = accountDocs.filter((entry) => typeof entry.data().password === 'string')
  if (!legacy.length) return
  const authRefs = legacy.map((entry) => credentials().doc(entry.id))
  const stored = await firestore.getAll(...authRefs)

  let batch = firestore.batch()
  let operations = 0
  for (let i = 0; i < legacy.length; i++) {
    const entry = legacy[i]
    const data = entry.data()
    const authRef = authRefs[i]
    if (!stored[i].exists) {
      const hashed = await hashPassword(data.password as string)
      batch.set(authRef, {
        username: data.username,
        name: data.name ?? '',
        role: data.role ?? 'staff',
        ...hashed,
        updatedAt: FieldValue.serverTimestamp(),
      })
      operations++
    }
    batch.update(entry.ref, { password: FieldValue.delete() })
    operations++
    if (operations >= 400) {
      await batch.commit()
      batch = firestore.batch()
      operations = 0
    }
  }
  if (operations) await batch.commit()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  const body = typeof req.body === 'object' && req.body !== null
    ? req.body as { username?: unknown; password?: unknown }
    : {}
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password || username.length > 128 || password.length > 256) {
    return res.status(400).json({ error: 'Masukkan username dan password.' })
  }

  try {
    const matches = await users().where('username', '==', username).limit(10).get()
    if (matches.empty) {
      const error = username.toLowerCase() === 'admin'
        ? 'Akun admin bawaan sudah dihentikan demi keamanan. Gunakan akun admin yang tersimpan di Manajemen Staff.'
        : 'Username atau password salah.'
      return res.status(401).json({ error })
    }
    const authDocs = await firestore.getAll(...matches.docs.map((entry) => credentials().doc(entry.id)))
    let index = -1
    for (let i = 0; i < matches.docs.length; i++) {
      const userData = matches.docs[i].data()
      const authData = authDocs[i].data()
      if (authDocs[i].exists) {
        if (await matchesPassword(password, authData?.salt, authData?.passwordHash)) { index = i; break }
      } else if (typeof userData.password === 'string' && userData.password === password) {
        index = i
        break
      }
    }

    if (index < 0) return res.status(401).json({ error: 'Username atau password salah.' })
    const account = matches.docs[index]
    const data = account.data()
    let role = authDocs[index].data()?.role ?? data.role
    if (role !== 'admin' && role !== 'staff') {
      return res.status(403).json({ error: 'Akun ini belum memiliki peran admin atau CS.' })
    }

    // Migrate every legacy record before issuing a session. This removes old
    // plaintext passwords before the browser receives any staff directory data.
    const allUsers = await users().get()
    await migrateLegacyPasswords(allUsers.docs)
    const secureAccount = await credentials().doc(account.id).get()
    role = secureAccount.data()?.role ?? role
    if (role !== 'admin' && role !== 'staff') return res.status(403).json({ error: 'Akun ini belum memiliki peran admin atau CS.' })

    const samplesRole = role === 'admin' ? 'admin' : 'cs'
    const token = await firebaseAuth.createCustomToken(account.id, {
      samplesRole,
      internalRole: role,
      internalName: typeof data.name === 'string' ? data.name.slice(0, 80) : username,
    })
    // Avoid returning any credential material to the browser.
    return res.json({ token, user: { id: account.id, username, name: data.name ?? username, role } })
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    console.error('Internal login failed:', { code: value?.code, message: value?.message })
    return res.status(503).json({ error: 'Server belum bisa menyiapkan login. Coba lagi sebentar.' })
  }
}

