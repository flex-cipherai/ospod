import { useEffect, useState } from 'react'
import { fetchClaimed } from './api'

// The live count of founding spots taken. null until it loads (or if it cannot be read).
export function useClaimed() {
  const [claimed, setClaimed] = useState(null)
  useEffect(() => {
    let alive = true
    fetchClaimed().then((n) => { if (alive && n !== null) setClaimed(n) })
    return () => { alive = false }
  }, [])
  return [claimed, setClaimed]
}
