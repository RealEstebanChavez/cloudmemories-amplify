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
} from "@aws-amplify/ui-react";
import { signOut, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function PerfilUsuario() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos del usuario autenticado
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        setUserData({
          id: user.userId,
          username: user.username,
          email: attributes.email || "No disponible",
          name: attributes.name || "Sin nombre registrado",
          birthdate: attributes.birthdate || "No registrada",
          phone_number: attributes.phone_number || "No disponible",
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

  // Cerrar sesión y volver al login
  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading) {
    return (
      <View 
        textAlign="center" 
        marginTop="5rem"
        padding="2rem"
      >
        <Flex 
          direction="column" 
          alignItems="center" 
          gap="1.5rem"
          backgroundColor="var(--amplify-colors-background-secondary)"
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

  if (!userData) {
    return (
      <View 
        textAlign="center" 
        marginTop="5rem"
        padding="2rem"
      >
        <Card variation="outlined" padding="2rem" maxWidth="400px" margin="0 auto">
          <Text fontSize="large" marginBottom="1.5rem">
            ⚠️ No se pudo cargar la información del perfil
          </Text>
          <Button onClick={() => router.push("/login")} variation="primary">
            Ir al login
          </Button>
        </Card>
      </View>
    );
  }

  const InfoItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <Card 
      variation="outlined" 
      padding="1rem"
      style={{
        transition: "all 0.2s ease",
        cursor: "default"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <Flex alignItems="center" gap="0.75rem">
        <View 
          backgroundColor="var(--amplify-colors-blue-10)"
          padding="0.75rem"
          borderRadius="medium"
          minWidth="50px"
          textAlign="center"
        >
          <Text fontSize="1.5rem">{icon}</Text>
        </View>
        <View flex="1">
          <Text fontSize="small" color="var(--amplify-colors-font-tertiary)">
            {label}
          </Text>
          <Text fontWeight="semibold" fontSize="medium">
            {value}
          </Text>
        </View>
      </Flex>
    </Card>
  );

  return (
    <>
    <Header />
    <View 
      padding="2rem" 
      maxWidth="800px" 
      margin="0 auto"
      minHeight="100vh"
      backgroundColor="var(--amplify-colors-background-secondary)"
    >
      {/* Header Card */}
      <Card 
        variation="elevated" 
        marginBottom="2rem"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white"
        }}
      >
        <Flex direction="column" alignItems="center" gap="1rem" padding="2rem">
          <View position="relative">
            <Image
              src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
              alt="Avatar"
              width="120px"
              height="120px"
              borderRadius="50%"
              style={{
                border: "4px solid white",
                boxShadow: "0 8px 16px rgba(0,0,0,0.2)"
              }}
            />
            <Badge
              variation="success"
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                padding: "0.5rem",
                fontSize: "0.75rem"
              }}
            >
              ✓ Verificado
            </Badge>
          </View>
          
          <Heading level={2} color="white">
            {userData.name}
          </Heading>
          
          <Text color="white" opacity="0.9">
            @{userData.username}
          </Text>
          
          <Badge 
            variation="info"
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 1rem"
            }}
          >
            👤 Usuario Activo
          </Badge>
        </Flex>
      </Card>

      {/* Info Section */}
      <Card variation="elevated">
        <View padding="1.5rem">
          <Heading level={4} marginBottom="1.5rem">
            📋 Información Personal
          </Heading>
          
          <Flex direction="column" gap="1rem">
            <InfoItem 
              icon="👤" 
              label="Nombre completo" 
              value={userData.name} 
            />
            
            <InfoItem 
              icon="📧" 
              label="Correo electrónico" 
              value={userData.email} 
            />
            
            <InfoItem 
              icon="📱" 
              label="Teléfono" 
              value={userData.phone_number} 
            />
            
            <InfoItem 
              icon="🎂" 
              label="Fecha de nacimiento" 
              value={userData.birthdate} 
            />
            
            <InfoItem 
              icon="🔑" 
              label="ID de usuario" 
              value={userData.id.substring(0, 20) + "..."} 
            />
          </Flex>

          <Divider marginTop="2rem" marginBottom="2rem" />

          {/* Action Buttons */}
          <Flex direction="column" gap="1rem">
            <Button 
              variation="primary" 
              size="large"
              onClick={() => router.push("/editar-perfil")}
              style={{
                width: "100%"
              }}
            >
              ✏️ Editar Perfil
            </Button>
            
            <Button 
              variation="primary"
              colorTheme="error"
              size="large"
              onClick={handleLogout}
              style={{
                width: "100%"
              }}
            >
              🚪 Cerrar Sesión
            </Button>
          </Flex>

          {/* Footer Info */}
          <View 
            marginTop="2rem" 
            padding="1rem"
            backgroundColor="var(--amplify-colors-background-secondary)"
            borderRadius="medium"
            textAlign="center"
          >
            <Text fontSize="small" color="var(--amplify-colors-font-tertiary)">
              🔒 Tu información está protegida y segura
            </Text>
          </View>
        </View>
      </Card>

      {/* Stats Card */}
      <Card variation="outlined" marginTop="2rem">
        <View padding="1.5rem">
          <Heading level={5} marginBottom="1rem">
            📊 Actividad
          </Heading>
          <Flex justifyContent="space-around" wrap="wrap" gap="1rem">
            <View textAlign="center" padding="1rem">
              <Text fontSize="2rem" fontWeight="bold" color="var(--amplify-colors-blue-60)">
                0
              </Text>
              <Text fontSize="small" color="var(--amplify-colors-font-tertiary)">
                Reportes
              </Text>
            </View>
            <View textAlign="center" padding="1rem">
              <Text fontSize="2rem" fontWeight="bold" color="var(--amplify-colors-green-60)">
                0
              </Text>
              <Text fontSize="small" color="var(--amplify-colors-font-tertiary)">
                Resueltos
              </Text>
            </View>
            <View textAlign="center" padding="1rem">
              <Text fontSize="2rem" fontWeight="bold" color="var(--amplify-colors-orange-60)">
                0
              </Text>
              <Text fontSize="small" color="var(--amplify-colors-font-tertiary)">
                Pendientes
              </Text>
            </View>
          </Flex>
        </View>
      </Card>
    </View>
    </>
  );
}