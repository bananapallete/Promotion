import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/pretendard-static.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/poppins/800.css'
import './styles/index.css'
import App from './App.jsx'
import { AppProvider } from './state/AppState.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
