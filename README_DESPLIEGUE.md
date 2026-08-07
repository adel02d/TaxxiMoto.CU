# 🛵 TaxiMotos.CU - Guía de Despliegue

Este proyecto es un sistema de gestión de mototaxis que funciona a través de Telegram y cuenta con un panel administrativo web.

## 🚀 Pasos para la Puesta en Marcha

### 1. Configuración de Telegram
1. Crea un bot en [@BotFather](https://t.me/BotFather) y obtén el **Token**.
2. Crea un grupo privado para los conductores.
3. Añade a tu bot al grupo y hazlo administrador.
4. Obtén el ID del grupo (puedes usar bots como `@MissRose_bot` y escribir `/id` en el grupo).

### 2. Variables de Entorno
Copia el archivo `.env.example` a `.env` y rellena los datos:
```bash
cp .env.example .env
```
*   `BOT_TOKEN`: El token de tu bot.
*   `DATABASE_URL`: Tu conexión a PostgreSQL.
*   `ADMIN_IDS`: Tu ID personal de Telegram (para gestionar conductores).
*   `DRIVER_GROUP_ID`: El ID del grupo de conductores.

### 3. Instalación Local
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 4. Configuración del Webhook (CRÍTICO)
Para que el bot responda, Telegram debe saber a dónde enviar los mensajes.
1. Tu servidor debe ser accesible públicamente vía HTTPS (usa `ngrok` si estás en local).
2. Abre en tu navegador: `https://tu-dominio.com/api/telegram/setup`
3. Deberías ver un mensaje: `"Webhook registrado correctamente"`.

### 5. Inicialización de la Base de Datos
Si no quieres usar `prisma db push`, puedes inicializar las tablas manualmente visitando:
`https://tu-dominio.com/api/db/setup`

---

## 🛠️ Comandos del Bot (Solo Administradores)
*   `/add_driver <ID> <Nombre> <Tel> <Matrícula>` - Registra un nuevo conductor.
*   `/remove_driver <ID>` - Desactiva a un conductor.
*   `/drivers` - Lista todos los conductores y sus estados.
*   `/stats` - Ver estadísticas de hoy.
*   `/broadcast <mensaje>` - Envía un anuncio a todos los clientes.

---

## 📦 Despliegue con Docker
El proyecto incluye un `Dockerfile` optimizado para despliegues en la nube (Render, Railway, Fly.io, etc.).
El puerto por defecto es el `10000`.

---

## ✨ Notas Técnicas
*   **BigInt:** El sistema soporta IDs de Telegram modernos (superiores a 32 bits).
*   **Next.js 14:** Utiliza App Router y Server Actions.
*   **Prisma:** Gestión de base de datos robusta.
