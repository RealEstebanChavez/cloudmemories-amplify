"use client";
import React from "react";
import {
  Card,
  View,
  Flex,
  Heading,
  Text,
  Button,
  Badge,
  Divider,
} from "@aws-amplify/ui-react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";

export default function PlanesDePago() {
  const router = useRouter();

  const planes = [
    {
      nombre: "Free",
      precio: "Gratis",
      descripcion: "Ideal para comenzar y explorar las funciones básicas.",
      beneficios: [
        "Hasta 2 álbumes",
        "10 fotos por álbum",
        "Comentarios ilimitados",
        "Sin soporte prioritario",
      ],
      color: "var(--amplify-colors-green-60)",
      destacado: false,
    },
    {
      nombre: "Pro",
      precio: "$10 / mes",
      descripcion: "Perfecto para familias que quieren más espacio y control.",
      beneficios: [
        "Álbumes ilimitados",
        "Subida de fotos en alta resolución",
        "Soporte prioritario 24/7",
        "Acceso compartido con 5 miembros",
      ],
      color: "var(--amplify-colors-blue-60)",
      destacado: true,
    },
    {
      nombre: "Premium",
      precio: "$20 / mes",
      descripcion:
        "La mejor opción para eventos grandes o almacenamiento sin límites.",
      beneficios: [
        "Almacenamiento ilimitado",
        "IA para clasificación automática de fotos",
        "Historial de cambios y versiones",
        "Soporte VIP y backups automáticos",
      ],
      color: "var(--amplify-colors-purple-60)",
      destacado: false,
    },
  ];

  return (
    <>
    <Header />
    <View
      padding="3rem"
      backgroundColor="var(--amplify-colors-background-secondary)"
      minHeight="100vh"
    >
      <Flex direction="column" alignItems="center" gap="2rem" textAlign="center">
        <Heading level={2}>✨ Actualiza tu Plan</Heading>
        <Text maxWidth="600px" color="var(--amplify-colors-font-tertiary)">
          Disfruta de más almacenamiento, mejores herramientas y soporte exclusivo. 
          Elige el plan que se adapte mejor a ti o a tu familia.
        </Text>
      </Flex>

      <Flex
        justifyContent="center"
        alignItems="stretch"
        gap="2rem"
        wrap="wrap"
        marginTop="3rem"
      >
        {planes.map((plan) => (
          <Card
            key={plan.nombre}
            variation={plan.destacado ? "elevated" : "outlined"}
            padding="2rem"
            maxWidth="350px"
            textAlign="center"
            style={{
              borderRadius: "1rem",
              background: plan.destacado
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "white",
              color: plan.destacado ? "white" : "inherit",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {plan.destacado && (
              <Badge
                variation="success"
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "white",
                }}
              >
                Recomendado
              </Badge>
            )}

            <Heading level={3} marginBottom="0.5rem">
              {plan.nombre}
            </Heading>
            <Text fontSize="1.5rem" fontWeight="bold" color={plan.color}>
              {plan.precio}
            </Text>

            <Divider marginTop="1rem" marginBottom="1rem" />

            <Text
              fontSize="small"
              marginBottom="1rem"
              opacity={plan.destacado ? "0.9" : "0.7"}
            >
              {plan.descripcion}
            </Text>

            <Flex
              direction="column"
              alignItems="flex-start"
              gap="0.5rem"
              marginTop="1rem"
            >
              {plan.beneficios.map((beneficio) => (
                <Text key={beneficio} fontSize="small">
                  ✅ {beneficio}
                </Text>
              ))}
            </Flex>

            <Button
              variation="primary"
              marginTop="2rem"
              size="large"
              style={{
                width: "100%",
                backgroundColor: plan.destacado
                  ? "white"
                  : "var(--amplify-colors-blue-60)",
                color: plan.destacado ? "#5A3EA6" : "white",
              }}
              onClick={() => router.push(`/suscripcion/${plan.nombre.toLowerCase()}`)}
            >
              {plan.nombre === "Free" ? "Plan actual" : "Elegir este plan"}
            </Button>
          </Card>
        ))}
      </Flex>

      <View marginTop="4rem" textAlign="center">
        <Text fontSize="small" color="var(--amplify-colors-font-tertiary)">
          🔒 Todas las transacciones son seguras y protegidas mediante AWS.
        </Text>
      </View>
    </View>
    </>
  );
}
