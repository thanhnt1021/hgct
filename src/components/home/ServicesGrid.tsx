'use client'

// 4 cục cha (dùng ở /services). Bấm → CHUYỂN TRANG.
// Style khớp card "Khám Phá AstroS" trang chủ: thẻ kem, icon-circle gold-tint centered, tiêu đề Playfair navy.

import Link from 'next/link'
import { Wallet, Heart, UsersRound, Compass, type LucideIcon } from 'lucide-react'

interface Parent { Icon: LucideIcon; title: string; desc: string; href: string }

const PARENTS: Parent[] = [
  { Icon: Wallet,     title: 'Sự nghiệp & Tiền bạc', desc: 'Định hướng sự nghiệp, tối ưu tài năng và thu hút tài lộc.', href: '/services?type=career' },
  { Icon: Heart,      title: 'Tình duyên cá nhân',   desc: 'Bản đồ tình cảm cá nhân: bạn yêu thế nào, cần gì và bài học tình duyên của bạn.', href: '/services?type=love' },
  { Icon: UsersRound, title: 'Mối quan hệ cặp đôi',  desc: 'So sánh hai bản đồ sao để hiểu sự kết nối, điểm hòa hợp và khác biệt giữa hai bạn.', href: '/services?type=synastry' },
  { Icon: Compass,    title: 'Vận hạn',              desc: 'Dự báo vận hạn, nắm bắt cơ hội và hóa giải thách thức.', href: '/services?type=transit' },
]

export default function ServicesGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {PARENTS.map(p => (
        <Link
          key={p.title}
          href={p.href}
          className="svc-grid-card block"
          style={{
            background: 'var(--as-surface)', border: '1px solid var(--as-border-soft)',
            borderRadius: 'var(--as-radius-lg)', padding: '1.75rem 1.5rem', textAlign: 'center',
            boxShadow: 'var(--as-shadow-card)', textDecoration: 'none',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(203,152,94,0.12)', border: '1px solid var(--as-border-gold)',
          }}>
            <p.Icon size={24} style={{ color: 'var(--as-cta)' }} strokeWidth={1.6} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--as-text-strong)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {p.title}
          </h3>
          <p style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-text)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.9rem' }}>
            {p.desc}
          </p>
          <span style={{ fontFamily: 'var(--font-vietnam)', color: 'var(--as-copper-deep)', fontSize: '0.82rem', fontWeight: 600 }}>
            Xem chi tiết →
          </span>
        </Link>
      ))}
      <style>{`.svc-grid-card{transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}.svc-grid-card:hover{transform:translateY(-4px);box-shadow:0 18px 50px rgba(22,54,83,.18);border-color:var(--as-border-gold)!important}`}</style>
    </div>
  )
}
