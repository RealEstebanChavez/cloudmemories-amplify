import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*=====================================================================
    MODELO NUEVO: USERS + FAMILIAS + ALBUMS COMPARTIDOS
=====================================================================*/

const schema = a.schema({

  /* ---------------------------------------------------------
    PERFIL DE USUARIO (Datos personales)
  --------------------------------------------------------- */
UserProfile: a
  .model({
    id: a.id().required(),         // <-- AGREGAR ESTO
    userId: a.string().required(),
    name: a.string().required(),
    email: a.string().required(),
    phone: a.string(),
    birthDate: a.date(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  })
  .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    FAMILIA (para álbumes compartidos)
  --------------------------------------------------------- */
  Family: a
    .model({
      name: a.string().required(),
      familyCode: a.string().required(), // Código para unirse (número o texto)
      createdBy: a.string().required(), // userId del admin
      members: a.hasMany("FamilyMember", "familyId"),
      familyAlbums: a.hasMany("FamilyAlbum", "familyId"),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    MIEMBROS DE FAMILIA
  --------------------------------------------------------- */
  FamilyMember: a
    .model({
      familyId: a.id().required(),
      family: a.belongsTo("Family", "familyId"),

      userId: a.string().required(), // cognito user
      userName: a.string().required(),
      userEmail: a.string().required(),

      isAdmin: a.boolean().default(false),
      createdAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    ÁLBUM PERSONAL (el que ya tenías)
  --------------------------------------------------------- */
  Album: a
    .model({
      name: a.string().required(),
      description: a.string(),
      coverPhotoUrl: a.string(),
      date: a.date(),
      createdBy: a.string().required(), // ID usuario creador
      photos: a.hasMany("Photo", "albumId"),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    ÁLBUM FAMILIAR (compartido entre miembros)
  --------------------------------------------------------- */
  FamilyAlbum: a
    .model({
      name: a.string().required(),
      description: a.string(),
      coverPhotoUrl: a.string(),
      date: a.date(),

      familyId: a.id().required(),
      family: a.belongsTo("Family", "familyId"),

      createdBy: a.string().required(), // userId creador
      photos: a.hasMany("FamilyPhoto", "albumId"),

      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    FOTO PERSONAL
  --------------------------------------------------------- */
  Photo: a
    .model({
      title: a.string(),
      description: a.string(),
      s3Key: a.string().required(),
      thumbnailKey: a.string(),
      fileSize: a.integer(),
      mimeType: a.string(),
      width: a.integer(),
      height: a.integer(),
      captureDate: a.date(),
      location: a.string(),
      uploadedBy: a.string(),
      albumId: a.id().required(),
      album: a.belongsTo("Album", "albumId"),
      comments: a.hasMany("Comment", "photoId"),
      likes: a.hasMany("Like", "photoId"),
      tags: a.string().array(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    FOTO FAMILIAR (compartida)
  --------------------------------------------------------- */
  FamilyPhoto: a
    .model({
      title: a.string(),
      description: a.string(),
      s3Key: a.string().required(),
      thumbnailKey: a.string(),
      fileSize: a.integer(),
      mimeType: a.string(),
      width: a.integer(),
      height: a.integer(),
      captureDate: a.date(),
      location: a.string(),
      uploadedBy: a.string(),

      albumId: a.id().required(), // pertenece a FamilyAlbum
      album: a.belongsTo("FamilyAlbum", "albumId"),

      comments: a.hasMany("FamilyComment", "photoId"),
      likes: a.hasMany("FamilyLike", "photoId"),
      tags: a.string().array(),

      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    COMENTARIOS (personal)
  --------------------------------------------------------- */
  Comment: a
    .model({
      content: a.string().required(),
      authorName: a.string().required(),
      authorEmail: a.string(),
      photoId: a.id().required(),
      photo: a.belongsTo("Photo", "photoId"),
      createdAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    COMENTARIOS FAMILIARES (en fotos family)
  --------------------------------------------------------- */
  FamilyComment: a
    .model({
      content: a.string().required(),
      userName: a.string().required(),
      userEmail: a.string(),
      photoId: a.id().required(),
      photo: a.belongsTo("FamilyPhoto", "photoId"),
      createdAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    LIKES PERSONALES
  --------------------------------------------------------- */
  Like: a
    .model({
      userId: a.string().required(),
      userName: a.string(),
      photoId: a.id().required(),
      photo: a.belongsTo("Photo", "photoId"),
      createdAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),

  /* ---------------------------------------------------------
    LIKES FAMILIARES
  --------------------------------------------------------- */
  FamilyLike: a
    .model({
      userId: a.string().required(),
      userName: a.string(),
      photoId: a.id().required(),
      photo: a.belongsTo("FamilyPhoto", "photoId"),
      createdAt: a.datetime(),
    })
    .authorization(allow => [allow.authenticated()]),
});

/* EXPORTS */
export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
