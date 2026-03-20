import SystemInfo from './SystemInfo'

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Hệ Thống</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 32 }}>Thông tin server và thống kê hệ thống</p>
      <SystemInfo />
    </div>
  )
}
