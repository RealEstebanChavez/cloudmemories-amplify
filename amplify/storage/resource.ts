import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'familyAlbumPhotos',  // Nombre de tu bucket S3
  access: (allow) => ({
    'photos/*': [  // Carpeta donde se guardan las fotos
      allow.authenticated.to(['read', 'write', 'delete'])
      // O usa: allow.guest.to(['read', 'write']) para pruebas sin auth
    ]
  })
});