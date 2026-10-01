import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { DialogHost } from './ui/components/Dialog'
import { SessionLayout } from './ui/components/SessionLayout'
import { Demo } from './ui/screens/Demo'
import { GameSettings } from './ui/screens/GameSettings'
import { HostTasks } from './ui/screens/HostTasks'
import { Home } from './ui/screens/Home'
import { JoinTable } from './ui/screens/JoinTable'
import { NewSession } from './ui/screens/NewSession'
import { OpenRound } from './ui/screens/OpenRound'
import { Players } from './ui/screens/Players'
import { Requests } from './ui/screens/Requests'
import { Summary } from './ui/screens/Summary'
import { Table } from './ui/screens/Table'
import { Titles } from './ui/screens/Titles'

// Lịch sử kéo theo thư viện biểu đồ — chỉ tải khi mở màn này
const History = lazy(() => import('./ui/screens/History').then((m) => ({ default: m.History })))

export default function App() {
  return (
    <BrowserRouter>
      {/* iPhone tai thỏ / Dynamic Island: che dải trên cùng để nội dung cuộn không lẫn vào thanh trạng thái */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-[26] h-[env(safe-area-inset-top)] bg-night" />
      <div className="mx-auto min-h-dvh max-w-lg px-4 pt-[env(safe-area-inset-top)] pb-28 land:max-w-4xl land:pr-[calc(6rem+env(safe-area-inset-right))] land:pb-4 land:pl-[calc(1rem+env(safe-area-inset-left))]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewSession />} />
          <Route path="/join" element={<JoinTable />} />
          <Route path="/demo" element={<Demo />} />
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
            <Route path="host" element={<HostTasks />} />
            <Route path="requests" element={<Requests />} />
            <Route path="players" element={<Players />} />
            <Route path="g/:gid/settings" element={<GameSettings />} />
            <Route path="g/:gid/open" element={<OpenRound />} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      <DialogHost />
    </BrowserRouter>
  )
}
