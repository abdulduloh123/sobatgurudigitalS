import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { google } from 'googleapis'

const firebaseApp = getApps().find((item) => item.name === 'drive-api') ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  }),
}, 'drive-api')

export const firebaseAuth = getAuth(firebaseApp)
export const firestore = getFirestore(firebaseApp)

const googleAuth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})
export const drive = google.drive({ version: 'v3', auth: googleAuth })

/** Verifies Firebase login and looks up the server-managed sample role. */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
  roles: string[],
): Promise<{ id: string; role: string } | null> {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    res.status(401).json({ error: 'Silakan login terlebih dahulu.' })
    return null
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token)
    const user = await firestore.collection('sampleUsers').doc(decoded.uid).get()
    const role = user.data()?.role
    if (typeof role !== 'string' || !roles.includes(role)) {
      res.status(403).json({ error: 'Akun ini belum memiliki akses.' })
      return null
    }
    return { id: decoded.uid, role }
  } catch {
    res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' })
    return null
  }
}
