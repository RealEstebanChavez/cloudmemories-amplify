"use client";
import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { getUrl, uploadData } from "aws-amplify/storage";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "@/amplify/data/resource";
import Header from "@/components/header";

const client = generateClient<Schema>();

export default function GaleriaConFamilias() {
  // ===== Estados principales =====
  const [personalAlbums, setPersonalAlbums] = useState<Array<Schema["Album"]["type"]>>([]);
  const [personalPhotos, setPersonalPhotos] = useState<Array<Schema["Photo"]["type"]>>([]);
  const [familyAlbums, setFamilyAlbums] = useState<Array<Schema["FamilyAlbum"]["type"]>>([]);
  const [familyPhotos, setFamilyPhotos] = useState<Array<Schema["FamilyPhoto"]["type"]>>([]);
  const [families, setFamilies] = useState<Array<Schema["Family"]["type"]>>([]);
  const [memberships, setMemberships] = useState<Array<Schema["FamilyMember"]["type"]>>([]);

  // urls
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [coverFamilyAlbumUrls, setCoverFamilyAlbumUrls] = useState<Record<string, string>>({});

  // selección
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedAlbumMode, setSelectedAlbumMode] = useState<"personal" | "family" | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  // UI
  const [view, setView] = useState<"albums" | "families">("albums"); // toggle main view
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);

  // crear álbum
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [albumDate, setAlbumDate] = useState("");
  const [creatingAsFamily, setCreatingAsFamily] = useState(false); // si true -> crear FamilyAlbum, necesita selectedFamilyId

  // crear familia / unirse
  const [newFamilyName, setNewFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ===== Utilities =====
  const getUser = async () => {
    try {
      const u: any = await getCurrentUser();
      // estructura esperada: { userId, username, signInDetails... }
      const userId = u?.userId ?? u?.username ?? null;
      const name =
        u?.signInDetails?.loginId ||
        u?.username ||
        u?.attributes?.email ||
        null;
      setCurrentUserId(userId);
      setCurrentUserName(name);
      return { userId, name };
    } catch (err) {
      console.warn("No se obtuvo usuario actual:", err);
      setCurrentUserId(null);
      setCurrentUserName(null);
      return { userId: null, name: null };
    }
  };

  // ===== Lecturas / Observers (reactivo) =====
  useEffect(() => {
    // Observers para álbumes personales
    const subAlbums = client.models.Album.observeQuery().subscribe({
      next: (res) => {
        setPersonalAlbums([...res.items]);
      },
      error: (e) => console.error("observeQuery Album error", e),
    });

    // Observers para FamilyAlbum
    const subFamilyAlbums = client.models.FamilyAlbum.observeQuery().subscribe({
      next: (res) => setFamilyAlbums([...res.items]),
      error: (e) => console.error("observeQuery FamilyAlbum error", e),
    });

    // Observers para Family / FamilyMember se actualizarán con reloads puntuales
    return () => {
      subAlbums.unsubscribe();
      subFamilyAlbums.unsubscribe();
    };
  }, []);

  // Cargar user y listas relacionadas
  useEffect(() => {
    (async () => {
      const { userId } = await getUser();
      if (userId) {
        await Promise.all([loadPersonalAlbums(userId), loadMemberships(userId)]);
      } else {
        // cargar álbumes públicos / o todos (según tu lógica) si no hay user
        await loadPersonalAlbums(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando seleccionas album (personal o familia) cargar fotos
  useEffect(() => {
    if (!selectedAlbumId || !selectedAlbumMode) {
      setPersonalPhotos([]);
      setFamilyPhotos([]);
      return;
    }
    if (selectedAlbumMode === "personal") {
      listPersonalPhotos(selectedAlbumId);
    } else {
      listFamilyPhotos(selectedAlbumId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlbumId, selectedAlbumMode]);

  // cuando cambian albums obtener portadas
  useEffect(() => {
    if (personalAlbums.length > 0) getCoverPhotoUrlsForPersonal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalAlbums]);

  useEffect(() => {
    if (familyAlbums.length > 0) getCoverPhotoUrlsForFamilyAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyAlbums]);

  // cuando photos cambian, obtener urls
  useEffect(() => {
    const photos = selectedAlbumMode === "personal" ? personalPhotos : familyPhotos;
    photos.forEach(async (photo) => {
      const key = photo.s3Key;
      if (key && !photoUrls[photo.id]) {
        try {
          const urlResult = await getUrl({ path: key, options: { expiresIn: 3600 } });
          setPhotoUrls((prev) => ({ ...prev, [photo.id]: urlResult.url.toString() }));
        } catch (err) {
          console.error("Error obteniendo URL:", err);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalPhotos, familyPhotos]);

  // ===== Funciones de carga =====
  async function loadPersonalAlbums(userId: string | null) {
    try {
      setLoading(true);
      const q = userId
        ? { filter: { createdBy: { eq: userId } }, limit: 200 }
        : { limit: 200 };
      const { data } = await client.models.Album.list(q as any);
      setPersonalAlbums(data || []);
    } catch (err) {
      console.error("Error cargando álbumes personales:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMemberships(userId: string) {
    try {
      // obtener FamilyMember donde userId == currentUserId
      const { data: mems } = await client.models.FamilyMember.list({
        filter: { userId: { eq: userId } },
        limit: 200,
      });
      setMemberships(mems || []);

      // obtener familias completas (por ids)
      const familyIds = (mems || []).map((m) => m.familyId).filter(Boolean);
      if (familyIds.length > 0) {
        // Fetch each family individually since 'in' operator is not supported
        const familyPromises = familyIds.map(id => client.models.Family.get({ id: id! }));
        const familyResults = await Promise.all(familyPromises);
        const fams = familyResults.map(result => result.data).filter(Boolean);
        setFamilies(fams as Array<Schema["Family"]["type"]>);
        // cargar álbumes familiares de esas familias
        await loadFamilyAlbumsFor(familyIds);
      } else {
        setFamilies([]);
        setFamilyAlbums([]);
      }
    } catch (err) {
      console.error("Error cargando memberships/families:", err);
    }
  }

  async function loadFamilyAlbumsFor(familyIds: string[]) {
    try {
      if (!familyIds || familyIds.length === 0) {
        setFamilyAlbums([]);
        return;
      }
      // Fetch albums for each family ID separately and combine results
      const allAlbums: Array<Schema["FamilyAlbum"]["type"]> = [];
      for (const familyId of familyIds) {
        const { data } = await client.models.FamilyAlbum.list({
          filter: { familyId: { eq: familyId } },
          limit: 500,
        });
        if (data) {
          allAlbums.push(...data);
        }
      }
      setFamilyAlbums(allAlbums);
    } catch (err) {
      console.error("Error cargando álbumes familiares:", err);
    }
  }

  async function listPersonalPhotos(albumId: string) {
    try {
      const { data } = await client.models.Photo.list({
        filter: { albumId: { eq: albumId } },
        limit: 500,
      });
      setPersonalPhotos(data || []);
    } catch (err) {
      console.error("Error listando fotos personales:", err);
    }
  }

  async function listFamilyPhotos(albumId: string) {
    try {
      const { data } = await client.models.FamilyPhoto.list({
        filter: { albumId: { eq: albumId } },
        limit: 500,
      });
      setFamilyPhotos(data || []);
    } catch (err) {
      console.error("Error listando fotos familiares:", err);
    }
  }

  // ===== Portadas =====
  async function getCoverPhotoUrlsForPersonal() {
    const urls: Record<string, string> = {};
    for (const alb of personalAlbums) {
      try {
        const result = await client.models.Photo.list({
          filter: { albumId: { eq: alb.id } },
          limit: 1,
        });
        const first = result.data?.[0];
        if (first?.s3Key) {
          const urlResult = await getUrl({ path: first.s3Key, options: { expiresIn: 3600 } });
          urls[alb.id ?? ""] = urlResult.url.toString();
        }
      } catch (err) {
        // ignore per-album errors
      }
    }
    setCoverUrls(urls);
  }

  async function getCoverPhotoUrlsForFamilyAlbums() {
    const urls: Record<string, string> = {};
    for (const alb of familyAlbums) {
      try {
        const result = await client.models.FamilyPhoto.list({
          filter: { albumId: { eq: alb.id } },
          limit: 1,
        });
        const first = result.data?.[0];
        if (first?.s3Key) {
          const urlResult = await getUrl({ path: first.s3Key, options: { expiresIn: 3600 } });
          urls[alb.id ?? ""] = urlResult.url.toString();
        }
      } catch (err) {
        // ignore
      }
    }
    setCoverFamilyAlbumUrls(urls);
  }

  // ===== Crear álbum (personal o familiar) =====
  async function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!albumName.trim()) {
      alert("El nombre del álbum es obligatorio");
      return;
    }
    if (creatingAsFamily && !selectedFamilyId) {
      alert("Selecciona una familia para crear el álbum familiar");
      return;
    }

    setLoading(true);
    try {
      if (creatingAsFamily) {
        // crear FamilyAlbum
        await client.models.FamilyAlbum.create({
          name: albumName,
          description: albumDescription || undefined,
          date: albumDate || undefined,
          familyId: selectedFamilyId!,
          createdBy: currentUserId || "unknown",
        } as any);
        alert("Álbum familiar creado");
      } else {
        // crear Album personal
        await client.models.Album.create({
          name: albumName,
          description: albumDescription || undefined,
          date: albumDate || undefined,
          createdBy: currentUserId || "unknown",
        } as any);
        alert("Álbum personal creado");
      }
      // limpiar
      setAlbumName("");
      setAlbumDescription("");
      setAlbumDate("");
      setShowCreateAlbumModal(false);
      // refrescar (observeQuery debería actualizar, pero forzamos)
      if (currentUserId) await loadPersonalAlbums(currentUserId);
      if (membershipHasFamily(selectedFamilyId)) {
        await loadFamilyAlbumsFor(memberships.map((m) => m.familyId).filter(Boolean) as string[]);
      }
    } catch (err) {
      console.error("Error creando álbum:", err);
      alert("Error creando álbum");
    } finally {
      setLoading(false);
    }
  }

  function membershipHasFamily(fid: string | null) {
    if (!fid) return false;
    return memberships.some((m) => m.familyId === fid);
  }

  // ===== Crear familia (genera código) =====
  function generateFamilyCode() {
    // 6 caracteres alfanum
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!newFamilyName.trim()) {
      alert("El nombre de la familia es obligatorio");
      return;
    }
    try {
      const { userId, name } = await getUser();
      const code = generateFamilyCode();
      const { data: created } = await client.models.Family.create({
        name: newFamilyName.trim(),
        familyCode: code,
        createdBy: userId || "unknown",
      } as any);

      if (!created) {
        alert("Error: No se pudo crear la familia");
        return;
      }

      // crear miembro admin
      await client.models.FamilyMember.create({
        familyId: created.id,
        userId: userId || "unknown",
        userName: name || "Usuario",
        userEmail: (name as string) || "",
        isAdmin: true,
      } as any);

      alert(`Familia creada. Código: ${code}`);
      setNewFamilyName("");
      // refrescar memberships
      if (userId) await loadMemberships(userId);
    } catch (err) {
      console.error("Error creando familia:", err);
      alert("Error creando familia");
    }
  }

  // ===== Unirse por código =====
  async function handleJoinFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) {
      alert("Ingresa el código de familia");
      return;
    }
    try {
      const { data: found } = await client.models.Family.list({
        filter: { familyCode: { eq: joinCode.trim() } },
        limit: 1,
      });

      if (!found || found.length === 0) {
        alert("Código de familia no válido");
        return;
      }

      const fam = found[0];
      const { userId, name } = await getUser();

      // verificar no duplicado
      const { data: existing } = await client.models.FamilyMember.list({
        filter: {
          familyId: { eq: fam.id },
          userId: { eq: userId },
        },
        limit: 1,
      });

      if (existing && existing.length > 0) {
        alert("Ya eres miembro de esta familia");
        return;
      }

      await client.models.FamilyMember.create({
        familyId: fam.id,
        userId: userId || "unknown",
        userName: name || "Usuario",
        userEmail: (name as string) || "",
        isAdmin: false,
      } as any);

      alert(`Te uniste a la familia ${fam.name}`);
      setJoinCode("");
      if (userId) await loadMemberships(userId);
    } catch (err) {
      console.error("Error uniéndose a familia:", err);
      alert("Error al intentar unirse");
    }
  }

  // ===== Subir foto (personal o familiar) =====
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedAlbumId || !selectedAlbumMode) {
      alert("Selecciona un álbum para subir la foto");
      return;
    }

    setUploading(true);
    try {
      const s3Key = `photos/${Date.now()}-${file.name}`;
      const { result } = await uploadData({ path: s3Key, data: file });
      // crear registro en modelo correspondiente
      if (selectedAlbumMode === "personal") {
        await client.models.Photo.create({
          albumId: selectedAlbumId,
          title: file.name,
          s3Key,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: currentUserId || "unknown",
        } as any);
      } else {
        await client.models.FamilyPhoto.create({
          albumId: selectedAlbumId,
          title: file.name,
          s3Key,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: currentUserId || "unknown",
        } as any);
      }
      alert("Imagen subida correctamente");
      // recargar fotos del álbum
      if (selectedAlbumMode === "personal") listPersonalPhotos(selectedAlbumId);
      else listFamilyPhotos(selectedAlbumId);
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      alert("Error al subir la imagen");
    } finally {
      setUploading(false);
      // limpiar input value - buscado por id
      const inp = document.getElementById("photo-upload") as HTMLInputElement | null;
      if (inp) inp.value = "";
    }
  }

  // ===== Helpers UI =====
  function openAlbum(id: string, mode: "personal" | "family") {
    setSelectedAlbumId(id);
    setSelectedAlbumMode(mode);
  }

  async function refreshAll() {
    if (currentUserId) await loadPersonalAlbums(currentUserId);
    if (currentUserId) await loadMemberships(currentUserId);
    if (selectedAlbumMode === "personal" && selectedAlbumId) await listPersonalPhotos(selectedAlbumId);
    if (selectedAlbumMode === "family" && selectedAlbumId) await listFamilyPhotos(selectedAlbumId);
  }

  // ===== Render =====
  return (
    <>
      <Header />
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setView("albums")} style={view === "albums" ? styles.activeTab : styles.tab}>Mis Álbumes</button>
            <button onClick={() => setView("families")} style={view === "families" ? styles.activeTab : styles.tab}>Familias</button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => {
                setShowCreateAlbumModal(true);
                setCreatingAsFamily(false);
              }}
              style={styles.createButton}
            >
              ➕ Crear Álbum
            </button>

            <button onClick={() => refreshAll()} style={styles.secondaryButton}>🔄 Refrescar</button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* ===================== VISTA: ALBUMES PERSONALES / FOTOS ===================== */}
        {view === "albums" && (
          <main style={styles.gallery}>
            {!selectedAlbumId ? (
              <>
                <h3 style={{ marginBottom: 8 }}>Álbumes personales</h3>
                <div style={styles.grid}>
                  {personalAlbums.map((alb) => (
                    <div key={alb.id} style={styles.card} onClick={() => openAlbum(alb.id!, "personal")}>
                      <div style={styles.imageWrapper}>
                        {coverUrls[alb.id ?? ""] ? (
                          <img src={coverUrls[alb.id ?? ""]} alt={alb.name ?? "Álbum"} style={styles.coverImage} />
                        ) : (
                          <div style={styles.placeholder}>📷</div>
                        )}

                        <div style={styles.dotsMenu} onClick={(e) => { e.stopPropagation(); setInfoId(infoId === alb.id ? null : alb.id); }}>⋮</div>

                        {infoId === alb.id && (
                          <div style={styles.infoCard}>
                            <h4>{alb.name}</h4>
                            {alb.description && <p style={styles.desc}>{alb.description}</p>}
                            {alb.date && <p>📅 {alb.date}</p>}
                            <p style={styles.createdBy}>👤 {alb.createdBy ?? "Desconocido"}</p>
                          </div>
                        )}
                      </div>
                      <div style={styles.albumName}>{alb.name ?? "Sin nombre"}</div>
                    </div>
                  ))}
                </div>
                {personalAlbums.length === 0 && <p style={{ color: "#6b7280", marginTop: 12 }}>No tienes álbumes personales. Crea uno nuevo.</p>}
              </>
            ) : (
              <>
                <button style={styles.backButton} onClick={() => { setSelectedAlbumId(null); setSelectedAlbumMode(null); }}>⬅ Volver a álbumes</button>

                <div style={{ marginTop: 12 }}>
                  <label htmlFor="photo-upload" style={styles.uploadLabel}>{uploading ? "Subiendo..." : "📤 Agregar Imagen"}</label>
                  <input id="photo-upload" type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
                </div>

                <h3 style={{ marginTop: 12 }}>Fotos</h3>
                <div style={styles.gridPhotos}>
                  {personalPhotos.map((p) => (
                    <div key={p.id} style={styles.photoCard} onClick={() => setFullscreenPhoto(photoUrls[p.id] ?? "")}>
                      <img src={photoUrls[p.id] ?? ""} alt={p.title ?? "Foto"} style={styles.photoImage} />
                      <div style={styles.photoHover}>
                        <p style={styles.photoTitle}>{p.title ?? "Sin título"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>
        )}

        {/* ===================== VISTA: FAMILIAS ===================== */}
        {view === "families" && (
          <main style={styles.gallery}>
            <div style={styles.split}>
              {/* Columna izquierda: crear / unirse / lista de familias */}
              <div style={styles.panel}>
                <h3>Mis familias</h3>

                <form onSubmit={handleCreateFamily} style={{ marginBottom: 12 }}>
                  <label style={styles.label}>Crear nueva familia</label>
                  <input style={styles.input} placeholder="Nombre de la familia" value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} />
                  <button type="submit" style={{ ...styles.submitButton, marginTop: 8 }}>✅ Crear</button>
                </form>

                <form onSubmit={handleJoinFamily} style={{ marginBottom: 12 }}>
                  <label style={styles.label}>Unirse por código</label>
                  <input style={styles.input} placeholder="Código de familia" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
                  <button type="submit" style={{ ...styles.submitButton, marginTop: 8 }}>🔗 Unirse</button>
                </form>

                <div style={{ marginTop: 16 }}>
                  <h4>Familias a las que perteneces</h4>
                  {families.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>Aún no perteneces a ninguna familia.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {families.map((f) => (
                        <li key={f.id} style={styles.familyItem}>
                          <div style={{ flex: 1 }}>
                            <strong>{f.name}</strong>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Código: {f.familyCode}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setSelectedFamilyId(f.id!); /* cargar albums de esa familia */ setSelectedAlbumId(null); setSelectedAlbumMode(null); }} style={styles.secondaryButton}>Abrir</button>
                            <button onClick={() => { setSelectedFamilyId(f.id!); setSelectedAlbumMode("family"); }} style={styles.ghostButton}>Álbumes</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Columna derecha: Álbumes de la familia seleccionada */}
              <div style={styles.panelWide}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>{selectedFamilyId ? `Álbumes de la familia` : "Selecciona una familia"}</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        setShowCreateAlbumModal(true);
                        setCreatingAsFamily(true);
                      }}
                      style={styles.createButton}
                    >
                      ➕ Crear Álbum Familiar
                    </button>
                  </div>
                </div>

                {!selectedFamilyId ? (
                  <p style={{ color: "#6b7280" }}>Selecciona una familia en la columna izquierda para ver sus álbumes.</p>
                ) : (
                  <>
                    <div style={styles.grid}>
                      {familyAlbums
                        .filter((a) => a.familyId === selectedFamilyId)
                        .map((alb) => (
                          <div key={alb.id} style={styles.card} onClick={() => openAlbum(alb.id!, "family")}>
                            <div style={styles.imageWrapper}>
                              {coverFamilyAlbumUrls[alb.id ?? ""] ? (
                                <img src={coverFamilyAlbumUrls[alb.id ?? ""]} alt={alb.name ?? "Álbum"} style={styles.coverImage} />
                              ) : (
                                <div style={styles.placeholder}>📷</div>
                              )}

                              <div style={styles.dotsMenu} onClick={(e) => { e.stopPropagation(); setInfoId(infoId === alb.id ? null : alb.id); }}>⋮</div>

                              {infoId === alb.id && (
                                <div style={styles.infoCard}>
                                  <h4>{alb.name}</h4>
                                  {alb.description && <p style={styles.desc}>{alb.description}</p>}
                                  {alb.date && <p>📅 {alb.date}</p>}
                                  <p style={styles.createdBy}>👤 {alb.createdBy ?? "Desconocido"}</p>
                                </div>
                              )}
                            </div>
                            <div style={styles.albumName}>{alb.name ?? "Sin nombre"}</div>
                          </div>
                        ))}
                    </div>

                    {/* Si se abrió un álbum familiar mostrar fotos */}
                    {selectedAlbumMode === "family" && selectedAlbumId && (
                      <>
                        <button style={styles.backButton} onClick={() => { setSelectedAlbumId(null); setSelectedAlbumMode(null); }}>⬅ Volver a álbumes</button>

                        <div style={{ marginTop: 12 }}>
                          <label htmlFor="family-photo-upload" style={styles.uploadLabel}>{uploading ? "Subiendo..." : "📤 Agregar Imagen familiar"}</label>
                          <input id="family-photo-upload" type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
                        </div>

                        <h4 style={{ marginTop: 12 }}>Fotos familiares</h4>
                        <div style={styles.gridPhotos}>
                          {familyPhotos.map((p) => (
                            <div key={p.id} style={styles.photoCard} onClick={() => setFullscreenPhoto(photoUrls[p.id] ?? "")}>
                              <img src={photoUrls[p.id] ?? ""} alt={p.title ?? "Foto"} style={styles.photoImage} />
                              <div style={styles.photoHover}>
                                <p style={styles.photoTitle}>{p.title ?? "Sin título"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        )}

        {/* ===== MODAL CREAR ÁLBUM (personal / familiar) ===== */}
        {showCreateAlbumModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCreateAlbumModal(false)}>
            <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.title}>📁 Crear nuevo álbum</h2>
              <form onSubmit={handleCreateAlbum} style={styles.form}>
                <label style={styles.label}>
                  Nombre *
                  <input type="text" value={albumName} onChange={(e) => setAlbumName(e.target.value)} style={styles.input} required />
                </label>

                <label style={styles.label}>
                  Descripción
                  <textarea value={albumDescription} onChange={(e) => setAlbumDescription(e.target.value)} style={{ ...styles.input, height: 80 }} />
                </label>

                <label style={styles.label}>
                  Fecha
                  <input type="date" value={albumDate} onChange={(e) => setAlbumDate(e.target.value)} style={styles.input} />
                </label>

                <label style={styles.label}>
                  Tipo
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="radio" checked={!creatingAsFamily} onChange={() => setCreatingAsFamily(false)} /> Personal
                    </label>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="radio" checked={creatingAsFamily} onChange={() => setCreatingAsFamily(true)} /> Familiar
                    </label>
                  </div>
                </label>

                {creatingAsFamily && (
                  <label style={styles.label}>
                    Familia (selecciona)
                    <select style={styles.input} value={selectedFamilyId ?? ""} onChange={(e) => setSelectedFamilyId(e.target.value)}>
                      <option value="">-- Selecciona una familia --</option>
                      {families.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.familyCode})</option>)}
                    </select>
                  </label>
                )}

                <div style={styles.buttonsRow}>
                  <button type="button" style={styles.cancelButton} onClick={() => setShowCreateAlbumModal(false)}>✖ Cancelar</button>
                  <button type="submit" style={styles.submitButton} disabled={loading}>{loading ? "Creando..." : "✅ Crear"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== FULLSCREEN IMAGE ===== */}
        {fullscreenPhoto && (
          <div style={styles.fullscreenOverlay} onClick={() => setFullscreenPhoto(null)}>
            <img src={fullscreenPhoto} alt="Foto ampliada" style={styles.fullscreenImage} />
          </div>
        )}
      </div>
    </>
  );
}

// ===== ESTILOS =====
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    padding: "2rem",
    position: "relative",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  tab: {
    padding: "0.5rem 1rem",
    borderRadius: 8,
    background: "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
  },
  activeTab: {
    padding: "0.5rem 1rem",
    borderRadius: 8,
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    cursor: "pointer",
  },
  createButton: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "0.5rem 0.9rem",
    border: "none",
    borderRadius: 10,
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#374151",
    padding: "0.4rem 0.7rem",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
  },
  ghostButton: {
    background: "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
    color: "#6b7280",
  },
  gallery: { maxWidth: "1200px", margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
    cursor: "pointer",
    backgroundColor: "white",
  },
  imageWrapper: { position: "relative", height: "180px" },
  coverImage: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#d1d5db",
    fontSize: "2.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsMenu: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: "50%",
    padding: "0.3rem 0.6rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
  infoCard: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "white",
    borderRadius: 8,
    boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
    padding: "0.8rem",
    width: 220,
    zIndex: 5,
  },
  desc: { fontSize: "0.85rem", color: "#6b7280" },
  createdBy: { fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.35rem" },
  albumName: {
    textAlign: "center",
    fontWeight: 700,
    padding: "0.6rem",
    fontSize: "1rem",
    color: "#4338ca",
    backgroundColor: "#f9fafb",
  },
  gridPhotos: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "0.75rem",
    marginTop: 12,
  },
  photoCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
    boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
    cursor: "pointer",
  },
  photoImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
  },
  photoHover: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
    transition: "opacity 0.2s",
  },
  photoTitle: { fontWeight: "700", marginBottom: 6 },
  photoDate: { fontSize: "0.85rem" },
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
    borderRadius: 8,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: "white",
    padding: "1.75rem",
    borderRadius: 12,
    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
    maxWidth: 520,
    width: "95%",
  },
  title: {
    margin: "0 0 0.75rem 0",
    fontSize: "1.25rem",
    textAlign: "center",
    color: "#4f46e5",
    fontWeight: 700,
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontWeight: 700, fontSize: "0.95rem", color: "#374151" },
  input: {
    width: "100%",
    marginTop: 6,
    padding: "0.6rem",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: "0.95rem",
  },
  buttonsRow: { display: "flex", justifyContent: "space-between", marginTop: 12 },
  cancelButton: { backgroundColor: "#ef4444", color: "white", padding: "0.55rem 1rem", borderRadius: 8, border: "none", cursor: "pointer" },
  submitButton: { backgroundColor: "#4f46e5", color: "white", padding: "0.55rem 1rem", borderRadius: 8, border: "none", cursor: "pointer" },
  backButton: { marginBottom: 8, backgroundColor: "#6366f1", color: "white", padding: "0.45rem 0.8rem", border: "none", borderRadius: 8, cursor: "pointer" },
  uploadLabel: { backgroundColor: "#4f46e5", color: "white", padding: "0.45rem 0.8rem", borderRadius: 8, cursor: "pointer" },
  split: { display: "flex", gap: 16 },
  panel: { width: 320, padding: 12, background: "white", borderRadius: 12, boxShadow: "0 6px 12px rgba(0,0,0,0.06)" },
  panelWide: { flex: 1, padding: 12, background: "white", borderRadius: 12, boxShadow: "0 6px 12px rgba(0,0,0,0.06)" },
  familyItem: { display: "flex", gap: 8, alignItems: "center", padding: "8px 6px", borderBottom: "1px solid #f3f4f6" },
  error: { color: "white", background: "#ef4444", padding: 8, borderRadius: 8, marginBottom: 12 },
};
