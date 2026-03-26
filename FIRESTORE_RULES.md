# Configuración de Reglas de Firestore

Para que QRAccess funcione correctamente, las reglas de Firestore deben permitir
lectura y escritura desde el navegador.

## Reglas para Desarrollo/Pruebas

Ve a [Firebase Console](https://console.firebase.google.com) →
Proyecto `basededatos-dd6b3` → Firestore Database → Reglas, y pega:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **IMPORTANTE**: Estas reglas abren la base de datos a cualquiera.
Solo usar en desarrollo. Para producción, usar reglas restrictivas.

## Reglas Recomendadas para Producción

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cualquier usuario autenticado puede leer/escribir fichajes
    match /fichajes/{id} {
      allow read, write: if true; // Ajustar según necesidades
    }
    // Solo admin puede gestionar usuarios y departamentos
    match /usuarios/{id} {
      allow read, write: if true;
    }
    match /departamentos/{id} {
      allow read, write: if true;
    }
  }
}
```
