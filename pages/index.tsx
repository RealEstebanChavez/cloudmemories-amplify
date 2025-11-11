import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { getUrl, uploadData } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";
import Header from "@/components/header";
const client = generateClient<Schema>();

export default function GaleriaConCrearAlbum() {
  const [albums, setAlbums] = useState<Array<Schema["Album"]["type"]>>([]);
  const [photos, setPhotos] = useState<Array<Schema["Photo"]["type"]>>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Estado para crear álbum
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  // ===== FUNCIONES DE GALERÍA =====
  function listAlbums() {
    client.models.Album.observeQuery().subscribe({
      next: (data) => setAlbums([...data.items]),
    });
  }

  function listPhotos(albumId: string) {
    client.models.Photo.observeQuery({
      filter: { albumId: { eq: albumId } },
    }).subscribe({
      next: (data) => setPhotos([...data.items]),
    });
  }

  async function getCoverPhotoUrls() {
    const urls: Record<string, string> = {};

    for (const album of albums) {
      const result = await client.models.Photo.list({
        filter: { albumId: { eq: album.id } },
        limit: 1,
      });

      const firstPhoto = result.data[0];
      if (firstPhoto?.s3Key) {
        try {
          const urlResult = await getUrl({
            path: firstPhoto.s3Key,
            options: { expiresIn: 3600 },
          });
          urls[album.id ?? ""] = urlResult.url.toString();
        } catch (err) {
          console.error("Error obteniendo portada:", err);
        }
      }
    }

    setCoverUrls(urls);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedAlbum) return;

    setUploading(true);
    try {
      const s3Key = `photos/${Date.now()}-${file.name}`;
      const uploadResult = await uploadData({
        path: s3Key,
        data: file,
      }).result;

      await client.models.Photo.create({
        albumId: selectedAlbum,
        title: file.name,
        s3Key,
      });

      console.log("✅ Imagen subida:", uploadResult.path);
    } catch (err) {
      console.error("❌ Error al subir imagen:", err);
    } finally {
      setUploading(false);
    }
  }

  // ===== FUNCIONES DE CREAR ÁLBUM =====
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("El nombre del álbum es obligatorio");
      return;
    }

    setLoading(true);
    try {
      await client.models.Album.create({
        name,
        description: description || undefined,
        date: date || undefined,
        createdBy: "usuario@ejemplo.com",
      });

      alert("✅ Álbum creado correctamente");
      setName("");
      setDescription("");
      setDate("");
      setShowModal(false);
      listAlbums(); // 🔄 Refrescar lista
    } catch (error) {
      console.error("Error creando álbum:", error);
      alert("❌ Error al crear el álbum");
    } finally {
      setLoading(false);
    }
  }

  // ===== EFECTOS =====
  useEffect(() => {
    listAlbums();
  }, []);

  useEffect(() => {
    if (selectedAlbum) listPhotos(selectedAlbum);
  }, [selectedAlbum]);

  useEffect(() => {
    if (albums.length > 0) getCoverPhotoUrls();
  }, [albums]);

  useEffect(() => {
    photos.forEach(async (photo) => {
      if (photo.s3Key && !photoUrls[photo.id]) {
        try {
          const urlResult = await getUrl({
            path: photo.s3Key,
            options: { expiresIn: 3600 },
          });
          setPhotoUrls((prev) => ({
            ...prev,
            [photo.id]: urlResult.url.toString(),
          }));
        } catch (err) {
          console.error("Error obteniendo URL:", err);
        }
      }
    });
  }, [photos]);

  // ===== RENDER =====
  return (
    <>
      <Header />
      <div style={styles.container}>
        {/* ===== BOTÓN CREAR ÁLBUM ===== */}
        {!selectedAlbum && (
          <div style={styles.buttonContainer}>
            <button
              style={styles.createButton}
              onClick={() => setShowModal(true)}
            >
              ➕ Crear nuevo álbum
            </button>
          </div>
        )}

        {/* ===== BOTÓN VOLVER ===== */}
        {selectedAlbum && (
          <button
            style={styles.backButton}
            onClick={() => setSelectedAlbum(null)}
          >
            ⬅ Volver a álbumes
          </button>
        )}

        {/* ===== SUBIR IMAGEN ===== */}
        {selectedAlbum && (
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="photo-upload" style={styles.uploadLabel}>
              {uploading ? "Subiendo..." : "📤 Agregar Imagen"}
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
          </div>
        )}

        <main style={styles.gallery}>
          {/* ===== LISTA DE ÁLBUMES ===== */}
          {!selectedAlbum ? (
            <div style={styles.grid}>
              {albums.map((album) => (
                <div
                  key={album.id}
                  style={styles.card}
                  onClick={() => setSelectedAlbum(album.id ?? "")}
                >
                  <div style={styles.imageWrapper}>
                    {coverUrls[album.id ?? ""] ? (
                      <img
                        src={coverUrls[album.id ?? ""]}
                        alt={album.name ?? "Álbum"}
                        style={styles.coverImage}
                      />
                    ) : (
                      <div style={styles.placeholder}>📷</div>
                    )}

                    <div
                      style={styles.dotsMenu}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInfo(showInfo === album.id ? null : album.id);
                      }}
                    >
                      ⋮
                    </div>

                    {showInfo === album.id && (
                      <div style={styles.infoCard}>
                        <h4>{album.name}</h4>
                        {album.description && (
                          <p style={styles.desc}>{album.description}</p>
                        )}
                        {album.date && <p>📅 {album.date}</p>}
                        <p style={styles.createdBy}>
                          👤 {album.createdBy ?? "Desconocido"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={styles.albumName}>
                    {album.name ?? "Sin nombre"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.gridPhotos}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  style={styles.photoCard}
                  onClick={() =>
                    setFullscreenPhoto(photoUrls[photo.id] ?? "")
                  }
                >
                  <img
                    src={photoUrls[photo.id] ?? ""}
                    alt={photo.title ?? "Foto"}
                    style={styles.photoImage}
                  />
                  <div style={styles.photoHover}>
                    <p style={styles.photoTitle}>
                      {photo.title ?? "Sin título"}
                    </p>
                    {photo.captureDate && (
                      <p style={styles.photoDate}>
                        📅 {photo.captureDate}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ===== MODAL CREAR ÁLBUM ===== */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div
              style={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.title}>📁 Crear nuevo álbum</h2>
              <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                  Nombre del álbum *
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Vacaciones 2025"
                    style={styles.input}
                    required
                  />
                </label>

                <label style={styles.label}>
                  Descripción
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej. Fotos del viaje a la playa"
                    style={{ ...styles.input, height: "80px" }}
                  />
                </label>

                <label style={styles.label}>
                  Fecha del evento
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={styles.input}
                  />
                </label>

                <div style={styles.buttonsRow}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => setShowModal(false)}
                  >
                    ✖ Cancelar
                  </button>
                  <button
                    type="submit"
                    style={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? "Creando..." : "✅ Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== PANTALLA COMPLETA ===== */}
        {fullscreenPhoto && (
          <div
            style={styles.fullscreenOverlay}
            onClick={() => setFullscreenPhoto(null)}
          >
            <img
              src={fullscreenPhoto}
              alt="Foto ampliada"
              style={styles.fullscreenImage}
            />
          </div>
        )}
      </div>
    </>
  );
}

// ===== ESTILOS GLOBALES =====
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    padding: "2rem",
    position: "relative",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1.5rem",
  },
  createButton: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(79,70,229,0.3)",
    transition: "all 0.3s",
  },
  backButton: {
    marginBottom: "1rem",
    backgroundColor: "#6366f1",
    color: "white",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
  },
  uploadLabel: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
  },
  gallery: { maxWidth: "1200px", margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    position: "relative",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
    transition: "transform 0.3s",
    cursor: "pointer",
    backgroundColor: "white",
  },
  imageWrapper: { position: "relative", height: "200px" },
  coverImage: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#d1d5db",
    fontSize: "3rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsMenu: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: "50%",
    padding: "0.3rem 0.6rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
  infoCard: {
    position: "absolute",
    top: "40px",
    right: "10px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    padding: "1rem",
    width: "200px",
    zIndex: 5,
  },
  desc: { fontSize: "0.85rem", color: "#6b7280" },
  createdBy: { fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.5rem" },
  albumName: {
    textAlign: "center",
    fontWeight: "600",
    padding: "0.8rem",
    fontSize: "1.1rem",
    color: "#4338ca",
    backgroundColor: "#f9fafb",
  },
  gridPhotos: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "1rem",
  },
  photoCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "12px",
    boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
    cursor: "pointer",
  },
  photoImage: {
    width: "100%",
    height: "220px",
    objectFit: "cover",
  },
  photoHover: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
    transition: "opacity 0.3s",
  },
  photoTitle: { fontWeight: "bold", marginBottom: "0.25rem" },
  photoDate: { fontSize: "0.8rem", opacity: 0.9 },
  fullscreenOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    cursor: "zoom-out",
  },
  fullscreenImage: {
    maxWidth: "90%",
    maxHeight: "90%",
    borderRadius: "8px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    maxWidth: "480px",
    width: "90%",
  },
  title: {
    margin: "0 0 1.5rem 0",
    fontSize: "1.5rem",
    textAlign: "center",
    color: "#4f46e5",
    fontWeight: "700",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  label: {
    fontWeight: "bold",
    fontSize: "0.95rem",
    color: "#374151",
  },
  input: {
    width: "100%",
    marginTop: "0.5rem",
    padding: "0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
  },
  buttonsRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "1rem",
  },
  cancelButton: {
    backgroundColor: "#ef4444",
    color: "white",
    padding: "0.6rem 1.2rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "0.6rem 1.5rem",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
