import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { sampleDriveAuth, sampleDriveDb } from '../../lib/firebase'
import type { Role } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => onAuthStateChanged(sampleDriveAuth, (nextUser) => {
    setUser(nextUser?.isAnonymous ? null : nextUser)
    setRole(null)
  }), [])

  useEffect(() => {
    if (!user) return
    let alive = true
    void user.getIdTokenResult().then(async ({ claims }) => {
      const claimRole = claims.samplesRole
      if (claimRole === 'admin' || claimRole === 'cs') {
        if (alive) setRole(claimRole)
        return
      }
      const snapshot = await getDoc(doc(sampleDriveDb, 'sampleUsers', user.uid))
      if (alive) setRole((snapshot.data()?.role as Role | undefined) ?? 'pending')
    }).catch(() => {
      if (alive) setRole('pending')
    })
    return () => { alive = false }
  }, [user])

  const loading = user === undefined || (user !== null && role === null)
  return { session: user ?? null, role, loading }
}

