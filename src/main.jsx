import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { captureAttribution } from './lib/attribution'
import { initTracking } from './lib/tracking'
import './styles/ospod.css'
import './styles/extras.css'

captureAttribution()
initTracking()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
