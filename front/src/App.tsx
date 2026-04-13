import { Routes, Route } from 'react-router-dom'
import { HomeScrollProvider } from './context/HomeScrollContext'
import Layout from './components/Layout/Layout'
import ComingSoon from './pages/Home/Home'
import Library from './pages/Library/Library'
import Community from './pages/Community/Community'
import Profile from './pages/Profile/Profile'
import MangaDetail from './pages/MangaDetail/MangaDetail'
import CreateManga from './pages/CreateManga/CreateManga'
import Register from './pages/Register/Register'

function App() {
  return (
    <HomeScrollProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<ComingSoon />} />
        <Route path="/library" element={<Library />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/manga/:id" element={<MangaDetail />} />
        <Route path="/create" element={<CreateManga />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Layout>
    </HomeScrollProvider>
  )
}

export default App
