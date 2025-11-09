import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*=====================================================================
SCHEMA PARA ÁLBUM DE FOTOS FAMILIAR
- Autenticación: Solo usuarios autenticados pueden acceder
- Albums: Organización de fotos por eventos/fechas
- Photos: Almacena metadatos de las fotos
- Comments: Comentarios en las fotos
=====================================================================*/

const schema = a.schema({
  // ============ MODELO: ALBUM ============
  Album: a
    .model({
      name: a.string().required(),
      description: a.string(),
      coverPhotoUrl: a.string(), // URL de la foto de portada
      date: a.date(), // Fecha del evento/álbum
      createdBy: a.string(), // Email o ID del creador
      photos: a.hasMany("Photo", "albumId"), // Relación con fotos
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(), // Solo usuarios autenticados
    ]),

  // ============ MODELO: PHOTO ============
  Photo: a
    .model({
      title: a.string(),
      description: a.string(),
      s3Key: a.string().required(), // Ruta en S3 donde se guarda la imagen
      thumbnailKey: a.string(), // Miniatura (opcional)
      fileSize: a.integer(), // Tamaño en bytes
      mimeType: a.string(), // image/jpeg, image/png, etc
      width: a.integer(), // Ancho de la imagen
      height: a.integer(), // Alto de la imagen
      captureDate: a.date(), // Fecha en que se tomó la foto
      location: a.string(), // Lugar donde se tomó
      uploadedBy: a.string(), // Usuario que subió la foto
      albumId: a.id().required(), // Relación con Album
      album: a.belongsTo("Album", "albumId"),
      comments: a.hasMany("Comment", "photoId"), // Comentarios
      likes: a.hasMany("Like", "photoId"), // Likes
      tags: a.string().array(), // Etiquetas: ["cumpleaños", "playa", "2024"]
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(),
    ]),

  // ============ MODELO: COMMENT ============
  Comment: a
    .model({
      content: a.string().required(),
      authorName: a.string().required(), // Nombre de quien comenta
      authorEmail: a.string(), // Email del autor
      photoId: a.id().required(),
      photo: a.belongsTo("Photo", "photoId"),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(),
    ]),

  // ============ MODELO: LIKE ============
  Like: a
    .model({
      userId: a.string().required(), // ID del usuario que dio like
      userName: a.string(), // Nombre del usuario
      photoId: a.id().required(),
      photo: a.belongsTo("Photo", "photoId"),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      // Evitar likes duplicados del mismo usuario
      allow.owner().to(["read"]),
    ]),

  // ============ MODELO: FAMILIA MEMBER (Opcional) ============
  FamilyMember: a
    .model({
      name: a.string().required(),
      email: a.string().required(),
      relation: a.string(), // "padre", "hijo", "tío", etc
      avatarUrl: a.string(),
      isAdmin: a.boolean().default(false), // Permisos especiales
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated(),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // CAMBIAMOS A AUTENTICACIÓN (no API Key pública)
    defaultAuthorizationMode: "userPool",
  },
});

/*=====================================================================
EJEMPLO DE USO EN EL FRONTEND:
=====================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

// ====== CREAR UN ÁLBUM ======
const createAlbum = async () => {
  const { data: newAlbum } = await client.models.Album.create({
    name: "Navidad 2024",
    description: "Fotos de la cena navideña en casa",
    date: "2024-12-25",
    createdBy: user.email
  });
  return newAlbum;
};

// ====== SUBIR UNA FOTO ======
// PASO 1: Subir a S3 usando Storage
import { uploadData } from 'aws-amplify/storage';

const uploadPhoto = async (file: File, albumId: string) => {
  try {
    // Subir archivo a S3
    const result = await uploadData({
      path: `photos/${Date.now()}-${file.name}`,
      data: file,
      options: {
        contentType: file.type
      }
    }).result;

    // PASO 2: Guardar metadatos en la base de datos
    const { data: newPhoto } = await client.models.Photo.create({
      title: file.name,
      s3Key: result.path,
      fileSize: file.size,
      mimeType: file.type,
      albumId: albumId,
      uploadedBy: user.email,
      captureDate: new Date().toISOString()
    });
    
    return newPhoto;
  } catch (error) {
    console.error('Error uploading:', error);
  }
};

// ====== OBTENER FOTOS DE UN ÁLBUM ======
const getAlbumPhotos = async (albumId: string) => {
  const { data: photos } = await client.models.Photo.list({
    filter: {
      albumId: { eq: albumId }
    }
  });
  return photos;
};

// ====== OBTENER URL DE UNA FOTO ======
import { getUrl } from 'aws-amplify/storage';

const getPhotoUrl = async (s3Key: string) => {
  const url = await getUrl({
    path: s3Key,
    options: {
      expiresIn: 3600 // URL válida por 1 hora
    }
  });
  return url.url;
};

// ====== AGREGAR COMENTARIO ======
const addComment = async (photoId: string, content: string) => {
  const { data: comment } = await client.models.Comment.create({
    content,
    photoId,
    authorName: user.name,
    authorEmail: user.email
  });
  return comment;
};

// ====== DAR LIKE ======
const likePhoto = async (photoId: string) => {
  const { data: like } = await client.models.Like.create({
    photoId,
    userId: user.id,
    userName: user.name
  });
  return like;
};

// ====== LISTAR TODOS LOS ÁLBUMES ======
const listAlbums = async () => {
  const { data: albums } = await client.models.Album.list();
  return albums;
};

// ====== BUSCAR FOTOS POR ETIQUETAS ======
const searchPhotosByTag = async (tag: string) => {
  const { data: photos } = await client.models.Photo.list({
    filter: {
      tags: { contains: tag }
    }
  });
  return photos;
};
*/