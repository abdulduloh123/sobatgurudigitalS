import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { firestore, requireUser } from '../../_lib/clients.js'

const scrypt = promisify(scryptCallback)
const APP_ID = process.env.FIREBASE_PROJECT_ID || 'sobatguru-digital'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
  if (!await requireUser(req, res, ['admin'])) return

  const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!name || !username || !password || name.length > 120 || username.length > 128 || password.length < 8 || password.length > 256) {
    return res.status(400).json({ error: 'Isi nama, username, dan password minimal 8 karakter.' })
  }

  try {
    const users = firestore.collection(`artifacts/${APP_ID}/public/data/usersData`)
    const duplicate = await users.where('username', '==', username).limit(1).get()
    if (!duplicate.empty) return res.status(409).json({ error: 'Username sudah dipakai. Pilih username lain.' })

    const userRef = users.doc()
    const salt = randomBytes(16).toString('hex')
    const hash = await scrypt(password, salt, 64) as Buffer
    const batch = firestore.batch()
    batch.set(userRef, { name, username, role: 'staff' })
    batch.set(firestore.collection('internalAuth').doc(userRef.id), {
      name,
      username,
      role: 'staff',
      salt,
      passwordHash: hash.toString('hex'),
    })
    await batch.commit()
    return res.status(201).json({ ok: true, user: { id: userRef.id, name, username, role: 'staff' } })
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    console.error('Staff account creation failed:', { code: value?.code, message: value?.message })
    return res.status(500).json({ error: 'Gagal membuat akun staff.' })
  }
}

