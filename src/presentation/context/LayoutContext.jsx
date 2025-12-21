import { createContext, useContext, useState } from 'react'

const LayoutContext = createContext()

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}

export const LayoutProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  return (
    <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      {children}
    </LayoutContext.Provider>
  )
}

