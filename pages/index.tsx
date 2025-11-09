import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export default function App() {
  // Estados
  const [albums, setAlbums] = useState<Array<Schema["Album"]["type"]>>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Array<Schema["Photo"]["type"]>>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"albums" | "photos">("albums");

  // Cargar álbumes al iniciar
  useEffect(() => {
    listAlbums();
  }, []);

  // Cargar fotos cuando se selecciona un álbum
  useEffect(() => {
    if (selectedAlbum) {
      listPhotos(selectedAlbum);
    }
  }, [selectedAlbum]);

  // Obtener URLs de las fotos
  useEffect(() => {
    photos.forEach(async (photo) => {
      if (photo.s3Key && !photoUrls[photo.id]) {
        try {
          const urlResult = await getUrl({
            path: photo.s3Key,
            options: { expiresIn: 3600 }
          });
          setPhotoUrls(prev => ({ ...prev, [photo.id]: urlResult.url.toString() }));
        } catch (error) {
          console.error("Error getting URL:", error);
        }
      }
    });
  }, [photos]);

  // ===== FUNCIONES DE ÁLBUMES =====
  function listAlbums() {
    client.models.Album.observeQuery().subscribe({
      next: (data) => setAlbums([...data.items]),
    });
  }

  async function createAlbum() {
    const name = window.prompt("Nombre del álbum (ej: Navidad 2024)");
    if (!name) return;
    
    const description = window.prompt("Descripción (opcional)");
    const date = window.prompt("Fecha del evento (YYYY-MM-DD)");

    try {
      await client.models.Album.create({
        name,
        description: description || undefined,
        date: date || undefined,
        createdBy: "usuario@ejemplo.com", // En producción usa el email real del usuario
      });
    } catch (error) {
      console.error("Error creating album:", error);
      alert("Error al crear el álbum");
    }
  }

  async function deleteAlbum(id: string) {
    if (confirm("¿Seguro que quieres eliminar este álbum?")) {
      try {
        await client.models.Album.delete({ id });
      } catch (error) {
        console.error("Error deleting album:", error);
      }
    }
  }

  // ===== FUNCIONES DE FOTOS =====
  function listPhotos(albumId: string) {
    client.models.Photo.observeQuery({
      filter: { albumId: { eq: albumId } }
    }).subscribe({
      next: (data) => setPhotos([...data.items]),
    });
  }

  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedAlbum) {
      alert("Selecciona un álbum primero");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert("Solo se permiten archivos de imagen");
      return;
    }

    setLoading(true);
    try {
      // 1. Subir a S3
      const result = await uploadData({
        path: `photos/${Date.now()}-${file.name}`,
        data: file,
        options: {
          contentType: file.type
        }
      }).result;

      // 2. Guardar metadatos
      const title = window.prompt("Título de la foto (opcional)") || file.name;
      
      await client.models.Photo.create({
        title,
        s3Key: result.path,
        fileSize: file.size,
        mimeType: file.type,
        albumId: selectedAlbum,
        uploadedBy: "usuario@ejemplo.com",
        captureDate: new Date().toISOString().split('T')[0],
        tags: []
      });

      alert("¡Foto subida exitosamente!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Error al subir la foto");
    } finally {
      setLoading(false);
    }
  }

  async function deletePhoto(id: string, s3Key: string) {
    if (confirm("¿Eliminar esta foto?")) {
      try {
        await client.models.Photo.delete({ id });
        // Nota: También deberías eliminar de S3, pero requiere configuración adicional
      } catch (error) {
        console.error("Error deleting photo:", error);
      }
    }
  }

  async function addComment(photoId: string) {
    const content = window.prompt("Escribe tu comentario:");
    if (!content) return;

    try {
      await client.models.Comment.create({
        content,
        photoId,
        authorName: "Usuario Familia",
        authorEmail: "usuario@ejemplo.com"
      });
      alert("¡Comentario agregado!");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

  // ===== RENDERIZADO =====
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>📸 Álbum Familiar</h1>
        <p style={styles.subtitle}>Comparte tus mejores momentos</p>
      </header>

      <nav style={styles.nav}>
        <button 
          style={{...styles.navButton, ...(view === 'albums' ? styles.navButtonActive : {})}}
          onClick={() => setView('albums')}
        >
          🏠 Álbumes
        </button>
        {selectedAlbum && (
          <button 
            style={{...styles.navButton, ...(view === 'photos' ? styles.navButtonActive : {})}}
            onClick={() => setView('photos')}
          >
            📷 Fotos
          </button>
        )}
      </nav>

      <main style={styles.main}>
        {view === 'albums' ? (
          // ===== VISTA DE ÁLBUMES =====
          <div>
            <div style={styles.actionBar}>
              <button onClick={createAlbum} style={styles.primaryButton}>
                ➕ Crear Nuevo Álbum
              </button>
            </div>

            <div style={styles.grid}>
              {albums.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>📁</p>
                  <p>No hay álbumes todavía</p>
                  <p style={styles.emptyHint}>Crea tu primer álbum para empezar</p>
                </div>
              ) : (
                albums.map((album) => (
                  <div key={album.id} style={styles.albumCard}>
                    <div style={styles.albumCover}>
                      {album.coverPhotoUrl ? (
                        <img src={album.coverPhotoUrl} alt={album.name} style={styles.coverImage} />
                      ) : (
                        <div style={styles.placeholderCover}>📷</div>
                      )}
                    </div>
                    <div style={styles.albumInfo}>
                      <h3 style={styles.albumName}>{album.name}</h3>
                      {album.description && (
                        <p style={styles.albumDescription}>{album.description}</p>
                      )}
                      {album.date && (
                        <p style={styles.albumDate}>📅 {album.date}</p>
                      )}
                    </div>
                    <div style={styles.albumActions}>
                      <button
                        onClick={() => {
                          setSelectedAlbum(album.id);
                          setView('photos');
                        }}
                        style={styles.viewButton}
                      >
                        Ver Fotos
                      </button>
                      <button
                        onClick={() => deleteAlbum(album.id)}
                        style={styles.deleteButton}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // ===== VISTA DE FOTOS =====
          <div>
            <div style={styles.actionBar}>
              <label style={styles.uploadLabel}>
                📤 Subir Foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadPhoto}
                  style={styles.fileInput}
                  disabled={loading}
                />
              </label>
              {loading && <span style={styles.loadingText}>Subiendo...</span>}
            </div>

            <div style={styles.photosGrid}>
              {photos.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>📸</p>
                  <p>No hay fotos en este álbum</p>
                  <p style={styles.emptyHint}>Sube tu primera foto</p>
                </div>
              ) : (
                photos.map((photo) => (
                  <div key={photo.id} style={styles.photoCard}>
                    <div style={styles.photoWrapper}>
                      {photoUrls[photo.id] ? (
                        <img 
                          src={photoUrls[photo.id]} 
                          alt={photo.title || 'Foto'} 
                          style={styles.photoImage}
                        />
                      ) : (
                        <div style={styles.photoLoading}>Cargando...</div>
                      )}
                    </div>
                    <div style={styles.photoInfo}>
                      <h4 style={styles.photoTitle}>{photo.title || 'Sin título'}</h4>
                      {photo.description && (
                        <p style={styles.photoDescription}>{photo.description}</p>
                      )}
                      {photo.captureDate && (
                        <p style={styles.photoDate}>📅 {photo.captureDate}</p>
                      )}
                      <div style={styles.photoActions}>
                        <button
                          onClick={() => addComment(photo.id)}
                          style={styles.commentButton}
                        >
                          💬 Comentar
                        </button>
                        <button
                          onClick={() => deletePhoto(photo.id, photo.s3Key || '')}
                          style={styles.deleteButtonSmall}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>💙 Álbum Familiar - Powered by AWS Amplify</p>
      </footer>
    </div>
  );
}

// ===== ESTILOS =====
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  title: {
    margin: 0,
    fontSize: '2.5rem',
    fontWeight: 'bold',
  },
  subtitle: {
    margin: '0.5rem 0 0 0',
    opacity: 0.9,
  },
  nav: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    justifyContent: 'center',
  },
  navButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    backgroundColor: '#f0f2f5',
    transition: 'all 0.3s',
  },
  navButtonActive: {
    backgroundColor: '#667eea',
    color: 'white',
    fontWeight: 'bold',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  actionBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.2s',
  },
  uploadLabel: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.2s',
  },
  fileInput: {
    display: 'none',
  },
  loadingText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  albumCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s, box-shadow 0.3s',
    cursor: 'pointer',
  },
  albumCover: {
    height: '200px',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholderCover: {
    fontSize: '4rem',
  },
  albumInfo: {
    padding: '1rem',
  },
  albumName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    color: '#1f2937',
  },
  albumDescription: {
    margin: '0 0 0.5rem 0',
    color: '#6b7280',
    fontSize: '0.9rem',
  },
  albumDate: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '0.85rem',
  },
  albumActions: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  viewButton: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  photoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  photoWrapper: {
    height: '300px',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoLoading: {
    color: '#9ca3af',
  },
  photoInfo: {
    padding: '1rem',
  },
  photoTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
  },
  photoDescription: {
    margin: '0 0 0.5rem 0',
    color: '#6b7280',
    fontSize: '0.9rem',
  },
  photoDate: {
    margin: '0 0 0.5rem 0',
    color: '#9ca3af',
    fontSize: '0.85rem',
  },
  photoActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  commentButton: {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButtonSmall: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '4rem',
    margin: '0 0 1rem 0',
  },
  emptyHint: {
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    color: '#6b7280',
    backgroundColor: 'white',
    marginTop: '3rem',
  },
};