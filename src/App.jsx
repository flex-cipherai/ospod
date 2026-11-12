import IndiePage from './pages/IndiePage'
import StudiosPage from './pages/StudiosPage'
import PrivacyPage from './pages/PrivacyPage'

// Three plain pages, each its own address, so no router is needed.
//   /          podcasters (Instagram ads)
//   /studios   studios and agencies (LinkedIn ads)
//   /privacy   privacy notice
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/studios') return <StudiosPage />
  if (path === '/privacy') return <PrivacyPage />
  return <IndiePage />
}
