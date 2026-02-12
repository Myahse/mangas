import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home/Home'
import Library from './pages/Library/Library'
import Community from './pages/Community/Community'
import Profile from './pages/Profile/Profile'
import MangaDetail from './pages/MangaDetail/MangaDetail'
import CreateManga from './pages/CreateManga/CreateManga'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/manga/:id" element={<MangaDetail />} />
        <Route path="/create" element={<CreateManga />} />
      </Routes>
    </Layout>
  )
}

export default App
