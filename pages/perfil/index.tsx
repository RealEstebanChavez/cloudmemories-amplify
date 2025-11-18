"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/header";
import {
  Card,
  Heading,
  View,
  Text,
  Button,
  Divider,
  Flex,
  Image,
  Loader,
  Badge,
  TextField,
} from "@aws-amplify/ui-react";
import { signOut, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export default function PerfilUsuario() {
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
  });

  /* ============================================================
      CARGAR USUARIO + PERFIL
  ============================================================ */
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        const datosCognito = {
          id: user.userId,
          username: user.username,
          email: attributes.email ?? "",
          name: attributes.name ?? "",
          birthdate: attributes.birthdate ?? "",
          phone: attributes.phone_number ?? "",
        };

        setUserData(datosCognito);

        /* -------------------------------
          BUSCAR PERFIL EN BD
        --------------------------------*/
        const { data: perfiles } = await client.models.UserProfile.list({
          filter: { userId: { eq: user.userId } },
        });

        let perfil = perfiles[0];

        /* -------------------------------
          CREAR PERFIL SI NO EXISTE
        --------------------------------*/
        if (!perfil) {
          const creado = await client.models.UserProfile.create({
            id: crypto.randomUUID(), // tu modelo REQUIERE id
            userId: user.userId,
            name: datosCognito.name,
            email: datosCognito.email,
            phone: datosCognito.phone,
            birthDate: datosCognito.birthdate || null,
          });

          if (creado.data) {
            perfil = creado.data;
          }
        }

        setProfileData(perfil);

        setForm({
          name: perfil.name ?? "",
          email: perfil.email ?? "",
          phone: perfil.phone ?? "",
          birthDate: perfil.birthDate ?? "",
        });
      } catch (error) {
        console.error("Error al obtener usuario:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    cargarUsuario();
  }, [router]);

  /* ============================================================
      GUARDAR CAMBIOS (CORREGIDO)
  ============================================================ */
  const guardarCambios = async () => {
    try {
      if (!profileData?.id) {
        console.error("⚠ No hay ID en el perfil, no se puede actualizar.");
        return;
      }

      const actualizado = await client.models.UserProfile.update({
        id: profileData.id, // obligatorio
        userId: profileData.userId, // obligatorio en tus reglas
        name: form.name,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate || null,
      });

      setProfileData(actualizado.data);
      setEditMode(false);
    } catch (error) {
      console.error("Error al guardar cambios:", error);
    }
  };

  /* ============================================================
      LOGOUT
  ============================================================ */
  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  /* ============================================================
      LOADER
  ============================================================ */
  if (loading) {
    return (
      <View textAlign="center" marginTop="5rem" padding="2rem">
        <Flex
          direction="column"
          alignItems="center"
          gap="1.5rem"
          padding="3rem"
          borderRadius="large"
          maxWidth="400px"
          margin="0 auto"
        >
          <Loader size="large" />
          <Text fontSize="large" fontWeight="medium">
            Cargando tu perfil...
          </Text>
        </Flex>
      </View>
    );
  }

  /* ============================================================
      COMPONENTE INFO
  ============================================================ */
  const InfoItem = ({ icon, label, value }: any) => (
    <Card variation="outlined" padding="1rem">
      <Flex alignItems="center" gap="0.75rem">
        <View padding="0.75rem" borderRadius="medium">
          <Text fontSize="1.5rem">{icon}</Text>
        </View>
        <View flex="1">
          <Text fontSize="small">{label}</Text>
          <Text fontWeight="semibold">{value}</Text>
        </View>
      </Flex>
    </Card>
  );

  /* ============================================================
      RENDER PRINCIPAL
  ============================================================ */
  return (
    <>
      <Header />

      <View padding="2rem" maxWidth="800px" margin="0 auto">
        <Card
          variation="elevated"
          marginBottom="2rem"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
          }}
        >
          <Flex direction="column" alignItems="center" padding="2rem" gap="1rem">
            <Image
              src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
              alt="Foto de perfil del usuario"
              width="120px"
              height="120px"
              borderRadius="50%"
            />
            <Heading level={2}>{profileData?.name}</Heading>
            <Text>@{userData.username}</Text>
            <Badge variation="success">✓ Registrado</Badge>
          </Flex>
        </Card>

        <Card variation="elevated">
          <View padding="1.5rem">
            <Heading level={4} marginBottom="1.5rem">
              📋 Información Personal
            </Heading>

            {editMode ? (
              <Flex direction="column" gap="1rem">
                <TextField
                  label="Nombre"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />

                <TextField
                  label="Correo"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <TextField
                  label="Teléfono"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />

                <TextField
                  type="date"
                  label="Fecha de nacimiento"
                  value={form.birthDate || ""}
                  onChange={(e) =>
                    setForm({ ...form, birthDate: e.target.value })
                  }
                />

                <Flex gap="1rem" marginTop="1.5rem">
                  <Button variation="primary" onClick={guardarCambios}>
                    💾 Guardar
                  </Button>
                  <Button variation="link" onClick={() => setEditMode(false)}>
                    Cancelar
                  </Button>
                </Flex>
              </Flex>
            ) : (
              <>
                <Flex direction="column" gap="1rem">
                  <InfoItem icon="👤" label="Nombre" value={profileData?.name} />
                  <InfoItem icon="📧" label="Correo" value={profileData?.email} />
                  <InfoItem icon="📱" label="Teléfono" value={profileData?.phone} />
                  <InfoItem
                    icon="🎂"
                    label="Nacimiento"
                    value={profileData?.birthDate || "—"}
                  />
                  <InfoItem
                    icon="🔑"
                    label="ID Usuario"
                    value={userData.id.substring(0, 20) + "..."}
                  />
                </Flex>

                <Divider marginTop="2rem" marginBottom="2rem" />

                <Flex direction="column" gap="1rem">
                  <Button variation="primary" onClick={() => setEditMode(true)}>
                    ✏️ Editar Perfil
                  </Button>

                  <Button colorTheme="error" onClick={handleLogout}>
                    🚪 Cerrar Sesión
                  </Button>
                </Flex>
              </>
            )}
          </View>
        </Card>
      </View>
    </>
  );
}
