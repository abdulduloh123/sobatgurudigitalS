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

// The existing Firebase service account also authenticates with Google Drive.
const googleAuth = new google.auth.JWT({
  email: process.env.FIREBASE_CLIENT_EMAIL,
  key: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})
export const drive = google.drive({ version: 'v3', auth: googleAuth })

/** Verifies Firebase login and looks up the server-managed sample role. */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
  roles: string[],
): Promise<{ id: string; role: string; name: string } | null> {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    res.status(401).json({ error: 'Silakan login terlebih dahulu.' })
    return null
  }

  let decoded: Awaited<ReturnType<typeof firebaseAuth.verifyIdToken>>
  try {
    decoded = await firebaseAuth.verifyIdToken(token)
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    console.error('Sample Firebase token verification failed:', {
      code: value?.code,
      message: value?.message,
    })
    res.status(401).json({ error: 'Sesi Firebase Samples tidak valid atau kedaluwarsa. Keluar dari Samples, lalu masuk kembali.' })
    return null
  }

  const claimedRole = decoded.samplesRole
  if (typeof claimedRole === 'string') {
    const internalRole = decoded.internalRole
    const expectedSamplesRole = internalRole === 'admin' ? 'admin' : internalRole === 'staff' ? 'cs' : null
    if (!roles.includes(claimedRole) || expectedSamplesRole !== claimedRole) {
      res.status(403).json({ error: 'Akun ini belum diberi akses ke bagian Samples ini.' })
      return null
    }
    try {
      const account = await firestore.collection('internalAuth').doc(decoded.uid).get()
      if (!account.exists || account.data()?.role !== internalRole) {
        res.status(403).json({ error: 'Akun internal ini sudah tidak aktif. Hubungi admin.' })
        return null
      }
      const name = typeof decoded.internalName === 'string' ? decoded.internalName : ''
      return { id: decoded.uid, role: claimedRole, name }
    } catch (error) {
      const value = error as { code?: unknown; message?: unknown }
      console.error('Internal Samples account check failed:', { code: value?.code, message: value?.message })
      res.status(503).json({ error: 'Server gagal memeriksa akun internal. Coba lagi sebentar.' })
      return null
    }
  }

  // Backward compatibility for Firebase accounts already assigned in sampleUsers.
  try {
    const user = await firestore.collection('sampleUsers').doc(decoded.uid).get()
    const role = user.data()?.role
    if (typeof role !== 'string' || !roles.includes(role)) {
      res.status(403).json({ error: 'Akun ini belum diberi peran Samples. Minta admin mengaktifkan peran admin atau cs.' })
      return null
    }
    return { id: decoded.uid, role, name: typeof decoded.email === 'string' ? decoded.email : '' }
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown }
    console.error('Sample role lookup failed:', {
      code: value?.code,
      message: value?.message,
    })
    res.status(503).json({ error: 'Server gagal memeriksa peran Samples. Admin perlu memeriksa Firebase project dan akses Firestore di Vercel Logs.' })
    return null
  }
}

