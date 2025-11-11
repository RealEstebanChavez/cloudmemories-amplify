import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
  user?: any;
  signOut?: () => void;
}

export default function Layout({ children, user, signOut }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    { icon: '🏠', label: 'Inicio', href: '/' },
    { icon: '📁', label: 'Álbumes', href: '/albums' },
    { icon: '📷', label: 'Todas las Fotos', href: '/photos' },
    { icon: '⭐', label: 'Favoritos', href: '/favorites' },
    { icon: '🔍', label: 'Buscar', href: '/search' },
    { icon: '🎂', label: 'Recuerdos', href: '/memories' },
    { icon: '👤', label: 'Mi Cuenta', href: '/account' },
    { icon: '💳', label: 'Planes Premium', href: '/pricing' },
  ];

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="layout-wrapper">
      {/* Header */}
      <header className="header">
        <button 
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        
        <Link href="/" className="logo">
          <span className="logo-icon">📸</span>
          <span className="logo-text">Álbum Familiar</span>
        </Link>

        <div className="header-actions">
          {user && (
            <>
              <span className="user-name">
                👋 Hola, {user.username || 'Usuario'}
              </span>
              <button onClick={signOut} className="btn-logout">
                🚪 Salir
              </button>
            </>
          )}
        </div>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          
          <div className="nav-divider" />
          
          <button 
            onClick={() => {
              signOut?.();
              setSidebarOpen(false);
            }} 
            className="nav-item logout"
          >
            <span className="nav-icon">🔓</span>
            <span className="nav-label">Cerrar Sesión</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <p className="storage-info">
            <span className="storage-icon">💾</span>
            <span>2.3 GB de 5 GB usados</span>
          </p>
          <Link href="/pricing" className="upgrade-btn">
            ⚡ Obtener más espacio
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      <style jsx>{`
        .layout-wrapper {
          min-height: 100vh;
          background: #f9fafb;
        }

        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          padding: 0 1rem;
          gap: 1rem;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .menu-toggle {
          width: 40px;
          height: 40px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .menu-toggle:hover {
          background: #e5e7eb;
          transform: scale(1.05);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: #111827;
          font-weight: 700;
          font-size: 1.25rem;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .header-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-name {
          color: #6b7280;
          font-size: 0.9rem;
          display: none;
        }

        .btn-logout {
          padding: 0.5rem 1rem;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .btn-logout:hover {
          background: #fecaca;
        }

        .overlay {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 98;
          animation: fadeIn 0.2s;
        }

        .sidebar {
          position: fixed;
          top: 64px;
          left: 0;
          bottom: 0;
          width: 280px;
          background: white;
          border-right: 1px solid #e5e7eb;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          z-index: 99;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .sidebar.open {
          transform: translateX(0);
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.5rem;
          color: #4b5563;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          font-size: 0.95rem;
        }

        .nav-item:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .nav-item.active {
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 600;
          border-right: 3px solid #4f46e5;
        }

        .nav-item.logout {
          color: #dc2626;
        }

        .nav-item.logout:hover {
          background: #fee2e2;
        }

        .nav-icon {
          font-size: 1.25rem;
          width: 24px;
          text-align: center;
        }

        .nav-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 1rem 0;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .storage-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: #6b7280;
          font-size: 0.85rem;
        }

        .storage-icon {
          font-size: 1.1rem;
        }

        .upgrade-btn {
          display: block;
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: transform 0.2s;
        }

        .upgrade-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .main-content {
          margin-top: 64px;
          padding: 2rem 1rem;
          min-height: calc(100vh - 64px);
        }

        @media (min-width: 768px) {
          .user-name {
            display: block;
          }

          .sidebar {
            transform: translateX(0);
          }

          .overlay {
            display: none;
          }

          .main-content {
            margin-left: 280px;
          }

          .menu-toggle {
            display: none;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}