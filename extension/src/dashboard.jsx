import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import DashboardApp from './DashboardApp'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <DashboardApp />
        </AuthProvider>
    </React.StrictMode>,
)
