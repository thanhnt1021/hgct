import DeployUI from './DeployUI'

export default function DeployPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 4, color: '#f0e8d0' }}>Deploy</h1>
      <p style={{ color: '#6b6585', fontSize: '0.8rem', marginBottom: 32 }}>Build và triển khai ứng dụng</p>
      <DeployUI />
    </div>
  )
}
