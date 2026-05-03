import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './lib/auth-context'
import { router } from './router'
import './styles.css'

const queryClient = new QueryClient()

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}
