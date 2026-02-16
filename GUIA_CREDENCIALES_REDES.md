# Guía de Obtención de Credenciales para Redes Sociales

Esta guía detalla los pasos necesarios para obtener las API Keys y Tokens requeridos para integrar la funcionalidad de publicación automática en tu sistema.

---

## 1. 🔵 Facebook e 📸 Instagram (Meta)
Meta agrupa ambas plataformas bajo su API de Graph.

1.  **Portal**: [Meta for Developers](https://developers.facebook.com/).
2.  **Preparación**: Debes tener una **Página de Facebook** y una **Cuenta de Instagram Business** vinculadas entre sí.
3.  **Pasos**:
    *   Crea una "App" de tipo **Business**.
    *   En la configuración de la App, añade el producto **Instagram Graph API**.
    *   Usa el **Graph API Explorer** para generar un "User Access Token" con los permisos: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`.
    *   Intercambia ese token por un **Page Access Token de larga duración** (que no expire a las 2 horas).
4.  **Datos para .env**:
    *   `FACEBOOK_ACCESS_TOKEN`: El token de larga duración de la página.
    *   `INSTAGRAM_BUSINESS_ACCOUNT_ID`: El ID numérico de la cuenta Business de Instagram (se obtiene consultando la API con el token anterior).

---

## 2. ✖️ X (Anteriormente Twitter)

1.  **Portal**: [X Developer Platform](https://developer.x.com/).
2.  **Pasos**:
    *   Suscríbete a un plan (el nivel **Free** permite publicar posts, pero el nivel **Basic** es más estable para aplicaciones comerciales).
    *   Crea un **Proyecto** y luego una **App** dentro de ese proyecto.
    *   En "User authentication settings", configura los permisos a **Read and Write**.
    *   Genera las claves en la sección "Keys and Tokens".
3.  **Datos para .env**:
    *   `TWITTER_API_KEY` / `TWITTER_API_KEY_SECRET`.
    *   `TWITTER_ACCESS_TOKEN` / `TWITTER_ACCESS_TOKEN_SECRET`.
    *   `TWITTER_BEARER_TOKEN`.

---

## 3. 🎵 TikTok

1.  **Portal**: [TikTok for Developers](https://developers.tiktok.com/).
2.  **Pasos**:
    *   Crea una cuenta y registra una nueva aplicación.
    *   Solicita el producto **Content Posting API**.
    *   TikTok requiere que tu app pase por un proceso de revisión antes de poder publicar en cuentas que no sean la tuya de prueba.
3.  **Datos para .env**:
    *   `TIKTOK_CLIENT_KEY`.
    *   `TIKTOK_CLIENT_SECRET`.

---

## 4. 🟢 WhatsApp Business

Existen dos caminos: la API Oficial o Gateways externos.

### Opción A: API Oficial Cloud (Meta)
1.  **Portal**: [Meta for Developers](https://developers.facebook.com/).
2.  **Pasos**:
    *   Añade el producto **WhatsApp** a tu App de Meta.
    *   Registra un número de teléfono para la API.
    *   Configura una cuenta de pago en el Administrador Comercial de Meta.
3.  **Datos para .env**:
    *   `WHATSAPP_TOKEN`: Token permanente generado desde el Business Manager.
    *   `WHATSAPP_PHONE_NUMBER_ID`: El ID del número emisor.

### Opción B: Gateways (Más rápido, ej: UltraMsg, Twilio)
Servicios que escanean un QR (como WhatsApp Web) y te dan una API.
1.  **Portal**: Ej: [UltraMsg](https://ultramsg.com/) o similar.
2.  **Datos para .env**:
    *   `WHATSAPP_INSTANCE_ID`.
    *   `WHATSAPP_TOKEN`.

---

## Recomendaciones de Seguridad
*   **Nunca** subas tu archivo `.env` a repositorios públicos como GitHub.
*   Rota tus tokens al menos una vez al año.
*   Para Facebook/Instagram, asegúrate de que el token sea "Everlasting" o implementa una lógica de refresco automático.
