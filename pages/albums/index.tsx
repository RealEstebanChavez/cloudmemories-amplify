import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import Layout from '@/components/Layout';
import Link from 'next/link';

const client = generateClient<Schema>();

interface AlbumsPageProps {
  user?: any;
  signOut?: () => void;
}

export default function AlbumsPage({ user, signOut }: AlbumsPageProps) {
  const [albums, setAlbums] = useState<Array<Schema['Album']['type']>>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAlbums();
  }, []);

  function loadAlbums() {
    try {
      client.models.Album.observeQuery().subscribe({
        next: (data) => {
          setAlbums([...data.items]);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error loading albums:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error en loadAlbums:', error);
      setLoading(false);
    }
  }

  async function createAlbum() {
    const name = window.prompt('Nombre del álbum:');
    if (!name) return;

    const description = window.prompt('Descripción (opcional):');
    const date = window.prompt('Fecha del evento (YYYY-MM-DD):');

    try {
      await client.models.Album.create({
        name,
        description: description || undefined,
        date: date || undefined,
        createdBy: user?.username || 'usuario@ejemplo.com',
      });
    } catch (error) {
      console.error('Error creating album:', error);
      alert('Error al crear el álbum');
    }
  }

  async function deleteAlbum(id: string, name: string) {
    if (confirm(`¿Eliminar el álbum "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await client.models.Album.delete({ id });
      } catch (error) {
        console.error('Error deleting album:', error);
        alert('Error al eliminar el álbum');
      }
    }
  }

  // Filtrar y ordenar álbumes
  const filteredAlbums = albums
    .filter(album => 
      album.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (album.description && album.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return (b.date || '').localeCompare(a.date || '');
      }
    });

  if (loading) {
    return (
      <Layout user={user} signOut={signOut}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando álbumes...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} signOut={signOut}>
      <div className="albums-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">📁 Mis Álbumes</h1>
            <p className="page-subtitle">
              {albums.length} {albums.length === 1 ? 'álbum' : 'álbumes'}
            </p>
          </div>
          <button onClick={createAlbum} className="btn-create">
            ➕ Nuevo Álbum
          </button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar álbumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="sort-controls">
            <label className="sort-label">Ordenar por:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              className="sort-select"
            >
              <option value="date">Fecha</option>
              <option value="name">Nombre</option>
            </select>
          </div>
        </div>

        {/* Albums Grid */}
        {filteredAlbums.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? (
              <>
                <div className="empty-icon">🔍</div>
                <h3>No se encontraron álbumes</h3>
                <p>Intenta con otros términos de búsqueda</p>
                <button onClick={() => setSearchTerm('')} className="btn-secondary">
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <div className="empty-icon">📁</div>
                <h3>Aún no tienes álbumes</h3>
                <p>Crea tu primer álbum para comenzar a organizar tus fotos</p>
                <button onClick={createAlbum} className="btn-primary">
                  ➕ Crear Primer Álbum
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="albums-grid">
            {filteredAlbums.map((album) => (
              <div key={album.id} className="album-card">
                <Link href={`/albums/${album.id}`} className="album-link">
                  <div className="album-cover">
                    {album.coverPhotoUrl ? (
                      <img src={album.coverPhotoUrl} alt={album.name} />
                    ) : (
                      <div className="album-placeholder">
                        <span className="placeholder-icon">📷</span>
                        <span className="placeholder-text">Sin fotos</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="album-body">
                  <Link href={`/albums/${album.id}`} className="album-title-link">
                    <h3 className="album-title">{album.name}</h3>
                  </Link>
                  
                  {album.description && (
                    <p className="album-description">{album.description}</p>
                  )}

                  <div className="album-meta">
                    {album.date && (
                      <span className="meta-item">
                        📅 {new Date(album.date).toLocaleDateString('es-MX', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    )}
                    <span className="meta-item">
                      👤 {album.createdBy}
                    </span>
                  </div>
                </div>

                <div className="album-actions">
                  <Link href={`/albums/${album.id}`} className="btn-view">
                    Ver Fotos
                  </Link>
                  <button
                    onClick={() => deleteAlbum(album.id, album.name)}
                    className="btn-delete"
                    title="Eliminar álbum"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .albums-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .page-subtitle {
          color: #6b7280;
          margin: 0.5rem 0 0 0;
          font-size: 1rem;
        }

        .btn-create {
          padding: 0.875rem 1.5rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .btn-create:hover {
          background: #4f46e5;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.2rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 3rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sort-label {
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .sort-select {
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          background: white;
        }

        .sort-select:focus {
          outline: none;
          border-color: #6366f1;
        }

        .albums-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .album-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }

        .album-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }

        .album-link {
          display: block;
          text-decoration: none;
        }

        .album-cover {
          height: 220px;
          background: #f3f4f6;
          position: relative;
          overflow: hidden;
        }

        .album-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .album-card:hover .album-cover img {
          transform: scale(1.05);
        }

        .album-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .placeholder-icon {
          font-size: 4rem;
          opacity: 0.5;
        }

        .placeholder-text {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .album-body {
          padding: 1.25rem;
          flex: 1;
        }

        .album-title-link {
          text-decoration: none;
          color: inherit;
        }

        .album-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: #111827;
          transition: color 0.2s;
        }

        .album-title-link:hover .album-title {
          color: #6366f1;
        }

        .album-description {
          color: #6b7280;
          font-size: 0.9rem;
          margin: 0 0 1rem 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .album-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .meta-item {
          color: #9ca3af;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .album-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 1px solid #f3f4f6;
        }

        .btn-view {
          flex: 1;
          padding: 0.75rem;
          background: #eef2ff;
          color: #6366f1;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn-view:hover {
          background: #dbeafe;
          color: #4f46e5;
        }

        .btn-delete {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fee2e2;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-delete:hover {
          background: #fecaca;
          transform: scale(1.05);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .empty-state h3 {
          color: #111827;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .empty-state p {
          color: #6b7280;
          margin: 0 0 1.5rem 0;
          font-size: 1rem;
        }

        .btn-primary, .btn-secondary {
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover {
          background: #4f46e5;
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #111827;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 1.5rem;
          }

          .albums-grid {
            grid-template-columns: 1fr;
          }

          .filters-bar {
            flex-direction: column;
          }
        }
      `}</style>
    </Layout>
  );
}