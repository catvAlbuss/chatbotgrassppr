# Guía de instalación y arranque — Gespro Asist

Esta guía permite levantar una copia nueva del chatbot, la API y el dashboard de administración.

## Requisitos

- Git.
- Node.js 20 LTS o superior y npm.
- MySQL 8 o un servidor MySQL compatible.
- Una aplicación de Meta con WhatsApp Business API para probar mensajes reales.
- Una cuenta de OpenAI si se utilizarán las respuestas generadas por IA.

Comprueba las herramientas instaladas:

```powershell
git --version
node --version
npm --version
mysql --version
```

## 1. Clonar el repositorio

```powershell
git clone <URL_DEL_REPOSITORIO>
cd chatbot-grass
```

No copies `node_modules` ni el archivo `.env` desde otra instalación. Las dependencias se reconstruyen y cada entorno debe tener sus propios secretos.

## 2. Instalar las dependencias

Instala el backend desde la raíz del proyecto:

```powershell
npm ci
```

Instala también las dependencias del dashboard React:

```powershell
cd dashboard
npm install
cd ..
```

## 3. Configurar las variables de entorno

Crea `.env` a partir de la plantilla incluida:

```powershell
Copy-Item .env.example .env
```

En macOS o Linux:

```bash
cp .env.example .env
```

Edita `.env` y sustituye todos los valores de ejemplo. Las variables principales son:

- `OPENAI_API_KEY`: clave de OpenAI.
- `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID` y `WABA_ID`: credenciales de Meta.
- `VERIFY_TOKEN`: secreto que también se configurará en el webhook de Meta.
- `ADMIN_PHONE` y `CONTACT_PHONE`: números con código de país, sin `+` ni espacios.
- `DASHBOARD_USER`, `DASHBOARD_PASSWORD` y `DASHBOARD_SECRET`: acceso y firma de sesiones del panel.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`: conexión MySQL.
- `PORT`: puerto HTTP del backend; por defecto, `3000`.
- `QR_PUBLIC_URL`: URL pública base del servicio.

La plantilla [`.env.example`](.env.example) contiene la lista completa y comentarios. No subas `.env` al repositorio.

## 4. Preparar la base de datos

Crea primero una base vacía con el mismo nombre indicado en `DB_NAME`. Por ejemplo:

```sql
CREATE DATABASE gespro_asist
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Después, desde la raíz del proyecto, crea o actualiza las tablas:

```powershell
npm run migrate
```

Opcionalmente, carga un usuario y registros de prueba definidos por `SEED_USER`, `SEED_PASSWORD` y `SEED_DNI`:

```powershell
npm run seed
```

No ejecutes el seed en producción salvo que necesites expresamente esos datos de prueba.

## 5. Compilar el dashboard

El backend sirve el dashboard compilado desde `/admin`:

```powershell
npm run build:dashboard
```

Ejecuta este comando nuevamente después de modificar archivos dentro de `dashboard/src`.

## 6. Iniciar la aplicación

Modo normal:

```powershell
npm start
```

Modo desarrollo, con reinicio automático del backend:

```powershell
npm run dev
```

Comprueba el servicio en:

- Landing: `http://localhost:3000/`
- Estado: `http://localhost:3000/health`
- Dashboard: `http://localhost:3000/admin`

Para trabajar en el dashboard con recarga automática, mantén el backend en el puerto `3000` y ejecuta en otra terminal:

```powershell
cd dashboard
npm run dev
```

Vite mostrará la URL local del dashboard y enviará las peticiones `/api` al backend.

## 7. Conectar el webhook de WhatsApp

Meta necesita una URL HTTPS pública. En desarrollo puedes exponer el puerto local con ngrok:

```powershell
ngrok config add-authtoken <TOKEN_DE_NGROK>
ngrok http 3000
```

En Meta Developers, configura:

- URL de devolución: `https://<dominio-publico>/webhook`.
- Token de verificación: el mismo valor de `VERIFY_TOKEN`.
- Campo del webhook: `messages`.

Después agrega tu número como destinatario de prueba y envía un mensaje al número configurado en WhatsApp Business.

Los tokens temporales de Meta suelen caducar. Si aparece `OAuthException` con código `190`, actualiza `WHATSAPP_TOKEN` y reinicia el backend. En producción utiliza un token de usuario del sistema con la vigencia y permisos adecuados.

## Verificación rápida después de clonar

La instalación está lista cuando:

1. `npm run migrate` termina sin errores.
2. `npm run build:dashboard` compila correctamente.
3. `npm start` conecta con MySQL y deja el servidor escuchando.
4. `/health` responde `OK` y `/admin` carga el dashboard.
5. Meta verifica `/webhook` y el bot responde a un mensaje de prueba.

## Comandos frecuentes

```powershell
npm ci                    # reinstalar dependencias del backend
npm run migrate           # crear o actualizar tablas
npm run seed              # cargar datos de prueba
npm run build:dashboard   # compilar React en public/admin
npm run dev               # backend en desarrollo
npm start                 # backend en modo normal
```

## Solución de problemas

- **No conecta con MySQL:** confirma que el servicio esté iniciado, que la base exista y que los valores `DB_*` sean correctos.
- **El dashboard muestra 404:** ejecuta `npm run build:dashboard` antes de iniciar el backend.
- **El dashboard de Vite no accede a la API:** inicia también el backend en `http://localhost:3000`.
- **Meta no verifica el webhook:** comprueba la URL HTTPS, la ruta `/webhook` y que `VERIFY_TOKEN` coincida exactamente.
- **El bot no envía mensajes:** revisa `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, los permisos de la aplicación y los logs del backend.

## Producción

En producción usa HTTPS, credenciales distintas a las de ejemplo, un token permanente de Meta y un proceso supervisado por el proveedor de hosting. Ejecuta la migración y la compilación del dashboard durante el despliegue, antes de iniciar `npm start`.
