import { useState } from 'react'
import Layout from './components/layout/Layout.jsx'
import Infrastructure from './pages/Infrastructure.jsx'
import Logs from './pages/Logs.jsx'
import Overview from './pages/Overview.jsx'
import Pipeline from './pages/Pipeline.jsx'
import SelfHealing from './pages/SelfHealing.jsx'
import Services from './pages/Services.jsx'

const PAGES = {
  overview: Overview,
  services: Services,
  pipeline: Pipeline,
  healing: SelfHealing,
  infrastructure: Infrastructure,
  logs: Logs,
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const Page = PAGES[activeTab] || Overview

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <Page />
    </Layout>
  )
}
