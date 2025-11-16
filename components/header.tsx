import { useState } from "react";
import Link from "next/link"; // ← AGREGADO
import { signOut } from "aws-amplify/auth"; // si no usas Amplify, puedes quitar esta línea

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(); // elimina la sesión
      window.location.href = "/login"; // redirige tras cerrar sesión
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("❌ Error al cerrar sesión");
    }
  };

  return (
    <header style={styles.header}>
      {/* ===== LOGO ===== */}
      <Link href="/" style={styles.logo}>
        📸 Mi Galería
      </Link>

      {/* ===== MENÚ ===== */}
      <div style={{ position: "relative" }}>
        <button
          style={styles.menuButton}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰ Menú
        </button>

        {menuOpen && (
          <div style={styles.dropdown}>
            <Link
              href="/perfil"
              style={styles.dropdownItem}
              onClick={() => setMenuOpen(false)}
            >
              👤 Ir a perfil
            </Link>

            <Link
              href="/pagos"
              style={styles.dropdownItem}
              onClick={() => setMenuOpen(false)}
            >
              💳 Actualizar a pagar
            </Link>

            <button
              style={styles.dropdownItemLogout}
              onClick={handleLogout}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "1rem 2rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: "1.25rem",
    fontWeight: "bold",
    textDecoration: "none",
    color: "white",
  },
  menuButton: {
    backgroundColor: "white",
    color: "#4f46e5",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
    transition: "background 0.3s",
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "110%",
    backgroundColor: "white",
    color: "#1f2937",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    minWidth: "180px",
    overflow: "hidden",
    animation: "fadeIn 0.2s ease-in-out",
  },
  dropdownItem: {
    padding: "0.8rem 1rem",
    background: "white",
    border: "none",
    textAlign: "left",
    textDecoration: "none",
    color: "#1f2937",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "background 0.2s",
  },
  dropdownItemLogout: {
    padding: "0.8rem 1rem",
    background: "white",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "#ef4444",
    fontWeight: "bold",
    transition: "background 0.2s",
  },
};