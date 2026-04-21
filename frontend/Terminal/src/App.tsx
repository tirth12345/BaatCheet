import './App.css'
import Navbar from './Components/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import News from './pages/News'
import NewsDetail from './pages/NewsDetail'
import Discussions from './pages/Discussions'
import DiscussionDetail from './pages/DiscussionDetail'
import AboutUs from './pages/AboutUs'
import ContactUs from './pages/ContactUs'
import Dashboard from './pages/Dashboard'
import VideoChat from './pages/VideoChat'
import VideoChatRoom from './pages/VideoChatRoom'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <div className="app-wrapper">
      <div className="animated-bg"></div>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/discussions/:id" element={<DiscussionDetail />} />
          <Route path="/AboutUs" element={<AboutUs />} />
          <Route path="/ContactUs" element={<ContactUs />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/video-chat" element={<VideoChat />} />
          <Route path="/video-chat/:roomId" element={<VideoChatRoom />} />
        </Routes>
      </AuthProvider>
    </div>
  )
}

export default App