# Configuración de Google OAuth

Este documento explica cómo configurar Google OAuth para el login con Google en la aplicación.

## 🔴 Error Actual

Si ves estos errores en la consola:
- `[GSI_LOGGER]: The given origin is not allowed for the given client ID`
- `Failed to load resource: the server responded with a status of 403`

Significa que el origen (URL) de tu aplicación no está configurado en Google Cloud Console.

## 📋 Pasos para Configurar Google OAuth

### 1. Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Asegúrate de que la **API de Google+** esté habilitada

### 2. Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Si es la primera vez, configura la **OAuth consent screen**:
   - Tipo de usuario: **External** (o Internal si tienes Google Workspace)
   - Completa la información requerida
   - Agrega los scopes necesarios

### 3. Configurar OAuth Client ID

1. **Application type**: Selecciona **Web application**
2. **Name**: Dale un nombre descriptivo (ej: "Sistema Poliverso - Web Client")
3. **Authorized JavaScript origins**: Agrega TODAS las URLs desde las que se accederá:
   ```
   http://localhost:3001
   http://localhost:5173
   http://127.0.0.1:3001
   http://127.0.0.1:5173
   http://192.168.100.112:3001
   http://192.168.100.84:3001
   http://172.16.222.222:3002
   ```
   ⚠️ **IMPORTANTE**: Agrega TODAS las URLs que uses, incluyendo:
   - localhost con diferentes puertos
   - IPs locales de red
   - URLs de producción cuando despliegues

4. **Authorized redirect URIs**: Agrega las mismas URLs:
   ```
   http://localhost:3001
   http://localhost:5173
   http://127.0.0.1:3001
   http://127.0.0.1:5173
   http://192.168.100.112:3001
   http://192.168.100.84:3001
   http://172.16.222.222:3002
   ```

### 4. Obtener el Client ID

1. Después de crear las credenciales, copia el **Client ID**
2. Se verá algo como: `584709457333-pc1r7el5ic8ap3539dqvuj5v5bqs203r.apps.googleusercontent.com`

### 5. Configurar en el Proyecto

1. Crea o edita el archivo `.env` en la carpeta `frontend/`
2. Agrega la variable de entorno:
   ```env
   VITE_GOOGLE_CLIENT_ID=584709457333-pc1r7el5ic8ap3539dqvuj5v5bqs203r.apps.googleusercontent.com
   ```
   (Reemplaza con tu Client ID real)

3. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## ✅ Verificación

1. Abre la aplicación en el navegador
2. Abre la consola del navegador (F12)
3. No deberías ver errores de "origin not allowed"
4. El botón de Google debería aparecer y funcionar correctamente

## 🔧 Solución de Problemas

### Error: "The given origin is not allowed"

**Causa**: La URL actual no está en la lista de "Authorized JavaScript origins"

**Solución**:
1. Verifica la URL exacta en la barra de direcciones del navegador
2. Agrega esa URL exacta (con http/https y puerto) a "Authorized JavaScript origins"
3. Espera unos minutos para que los cambios se propaguen
4. Recarga la página

### Error: "Failed to load resource: 403"

**Causa**: Similar al anterior, pero puede ser también un problema de permisos

**Solución**:
1. Verifica que la API de Google+ esté habilitada
2. Verifica que el Client ID sea correcto
3. Verifica que el origen esté en la lista permitida

### El botón de Google no aparece

**Causa**: La variable `VITE_GOOGLE_CLIENT_ID` no está configurada

**Solución**:
1. Verifica que el archivo `.env` exista en `frontend/`
2. Verifica que la variable esté correctamente escrita
3. Reinicia el servidor de desarrollo

### FedCM was disabled

**Causa**: Es solo un mensaje informativo del navegador sobre una característica experimental

**Solución**: Puedes ignorarlo, no afecta la funcionalidad

## 📝 Notas Importantes

- ⚠️ **Nunca subas el archivo `.env` al repositorio** (debe estar en `.gitignore`)
- ⚠️ **Cada entorno (desarrollo, producción) necesita su propio Client ID** o configurar múltiples orígenes
- ⚠️ **Los cambios en Google Cloud Console pueden tardar unos minutos en aplicarse**
- ⚠️ **Para producción, usa HTTPS** y agrega la URL de producción a los orígenes permitidos

## 🔗 Enlaces Útiles

- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentación de Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [React OAuth Google](https://www.npmjs.com/package/@react-oauth/google)
