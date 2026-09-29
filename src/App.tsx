import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { SessionLayout } from './ui/components/SessionLayout'
import { GameSettings } from './ui/screens/GameSettings'
import { Home } from './ui/screens/Home'
import { NewSession } from './ui/screens/NewSession'
import { OpenRound } from './ui/screens/OpenRound'
import { Players } from './ui/screens/Players'
import { Summary } from './ui/screens/Summary'
import { Table } from './ui/screens/Table'
import { Titles } from './ui/screens/Titles'

// Lịch sử kéo theo thư viện biểu đồ — chỉ tải khi mở màn này
const History = lazy(() => import('./ui/screens/History').then((m) => ({ default: m.History })))

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewSession />} />
          <Route path="/s/:sid" element={<SessionLayout />}>
            <Route index element={<Table />} />
            <Route path="summary" element={<Summary />} />
            <Route
              path="history"
              element={
                <Suspense fallback={<p className="pt-24 text-center text-muted">Đang tải…</p>}>
                  <History />
                </Suspense>
              }
            />
            <Route path="titles" element={<Titles />} />
            <Route path="players" element={<Players />} />
            <Route path="g/:gid/settings" element={<GameSettings />} />
            <Route path="g/:gid/open" element={<OpenRound />} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
