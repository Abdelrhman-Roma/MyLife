import React from 'react'
import ReactDOM from 'react-dom/client'
import AppProviders from './app/providers/AppProviders'
import './styles/tokens.css'
import './styles/globals.css'
import './styles/auth.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>
)
