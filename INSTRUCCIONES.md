# 🚀 GUÍA DE INSTALACIÓN - CHATBOT WHATSAPP (WINDOWS)

## ═══ PASO 1: INSTALAR NODE.JS ═══════════════════════════

1. Ve a: https://nodejs.org
2. Descarga la versión LTS (Long Term Support)
3. Instala con todos los valores por defecto
4. Verifica en CMD:

```cmd
node --version
npm --version
```

---

## ═══ PASO 2: CREAR EL PROYECTO ══════════════════════════

Abre el **Símbolo del sistema (CMD)** como Administrador:

```cmd
:: Crea la carpeta del proyecto
mkdir C:\chatbot-grass
cd C:\chatbot-grass

:: Inicializa el proyecto
npm init -y
```

---

## ═══ PASO 3: INSTALAR DEPENDENCIAS ══════════════════════

```cmd
npm install express openai axios dotenv qrcode
npm install --save-dev nodemon
```

---

## ═══ PASO 4: COPIAR LOS ARCHIVOS ════════════════════════

Copia todos los archivos del proyecto en C:\chatbot-grass\:
- index.js
- flujo.js
- whatsapp.js
- openai.js
- storage.js
- qr.js
- package.json
- .env

---

## ═══ PASO 5: CONFIGURAR EL .ENV ═════════════════════════

Abre el archivo `.env` con el Bloc de notas y llena:

```
OPENAI_API_KEY=tu_nueva_api_key_de_openai
WHATSAPP_TOKEN=token_que_te_dio_meta
PHONE_NUMBER_ID=id_del_numero_en_meta
VERIFY_TOKEN=cualquier_palabra_secreta_tuya
ADMIN_PHONE=51987654321
PAYMENT_YAPE=987654321
PAYMENT_PLIN=987654321
PAYMENT_ACCOUNT=Grass Sintético SAC
PORT=3000
```

---

## ═══ PASO 6: INSTALAR NGROK (Para URL pública) ══════════

1. Ve a: https://ngrok.com/download
2. Descarga ngrok para Windows
3. Extrae el archivo en C:\ngrok\
4. Crea cuenta gratuita en ngrok.com y copia tu token
5. En CMD:

```cmd
C:\ngrok\ngrok.exe config add-authtoken TU_TOKEN_NGROK
```

---

## ═══ PASO 7: CORRER EL CHATBOT ══════════════════════════

### Terminal 1 - Inicia el servidor:
```cmd
cd C:\chatbot-grass
node index.js
```

### Terminal 2 - Inicia ngrok (en otra ventana de CMD):
```cmd
C:\ngrok\ngrok.exe http 3000
```

Ngrok te dará una URL así:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Copia esa URL (la de https://)

---

## ═══ PASO 8: CONFIGURAR WEBHOOK EN META ═════════════════

1. Ve al panel de Meta Developers
2. Tu App → WhatsApp → Configuración
3. En "Webhooks" → "Configurar"
4. URL del webhook: https://abc123.ngrok.io/webhook
5. Token de verificación: (el que pusiste en VERIFY_TOKEN del .env)
6. Haz clic en "Verificar y guardar"
7. Suscríbete a: messages

---

## ═══ PASO 9: PROBAR EL CHATBOT ══════════════════════════

1. En el panel de Meta, busca "Número de prueba"
2. Agrega tu número personal a la lista de prueba
3. Envía "Hola" al número de prueba desde WhatsApp
4. ¡El bot debe responder!

---

## ═══ COMANDOS ÚTILES ═════════════════════════════════════

```cmd
:: Ver logs del servidor
node index.js

:: Modo desarrollo (reinicia automático)
npx nodemon index.js

:: Instalar dependencias nuevas
npm install nombre-paquete
```

---

## ═══ COMANDOS DEL ADMINISTRADOR ═════════════════════════

El número registrado como ADMIN_PHONE puede enviar:

- APROBAR_RES-123456  → Confirma pago y reserva
- RECHAZAR_RES-123456 → Rechaza el pago

---

## ═══ FLUJO COMPLETO DEL CHATBOT ════════════════════════

```
Cliente escribe "Hola"
    ↓
Menú: Reservar / Consultar / Disponibilidad
    ↓
Elige producto (Fútbol / Vóley / Evento)
    ↓
Ingresa DNI → Nombre → Apellido
    ↓
Elige Fecha → Elige Hora(s)
    ↓
Resumen + Confirmación
    ↓
Instrucciones de pago (Yape/Plin)
    ↓  (10 minutos)
Cliente envía número de operación + captura
    ↓
Notificación al ADMIN
    ↓
ADMIN responde APROBAR o RECHAZAR
    ↓
Cliente notificado + Slot marcado ocupado
```

---

## ═══ PARA PRODUCCIÓN (24/7) ═════════════════════════════

En lugar de ngrok, usar un servidor en la nube:
- Railway: https://railway.app (gratis)
- Render: https://render.com (gratis)
- VPS: DigitalOcean, AWS, etc.
