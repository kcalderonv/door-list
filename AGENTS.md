## contexto

- Consulta la documentación oficial de la versión instalada de Next.js en `node_modules/next/dist/docs/` antes de escribir código de framework y considera explícitamente que esa versión puede diferir de lo que conoces.
- Usa Server Components por defecto y añade `"use client"` solo cuando exista una necesidad concreta de ejecución en el cliente; declárala en la descripción del cambio.

## estructura

- Coloca las rutas en `app/`, la UI compartida en `components/`, la lógica y las utilidades compartidas en `lib/` y los clientes de Supabase en `lib/supabase/`.
- Mantén cada componente usado por una sola ruta junto a esa ruta y muévelo a `components/` cuando lo utilicen dos o más rutas.

## vocabulario

- Usa `Event`, `TicketType`, `Ticket` y `Registration` con un significado único y consistente en todo el repositorio; mantenlos como entidades distintas y no los uses como sinónimos.
- Nombra las tablas en snake_case y en plural según su entidad: `events`, `ticket_types`, `tickets`, `registrations`.

## idioma

- Escribe el código, los identificadores y los tipos en inglés y los textos de la interfaz en español.
- Nombra las rutas públicas en español y los componentes que las sirven en inglés.

## casing

- Limita snake_case a la capa de persistencia y convierte sus nombres a camelCase antes de exponerlos fuera de esa capa.
- Usa camelCase en todos los contratos de API, tanto en solicitudes como en respuestas.

## puente único de verdad

- Define en `lib/` los tipos compartidos entre API, correo y UI e impórtalos sin redefinirlos por archivo.
- Define en `lib/` los helpers de fecha y formato y reutilízalos sin copiarlos entre pantallas.

## errores

- Devuelve toda respuesta de error de la API como JSON con la forma `{ error: string }` y responde a los errores de negocio con el código HTTP correspondiente y nunca con 200.
- Comprueba `response.ok` en el cliente antes de interpretar el cuerpo de la respuesta.
- Traduce los errores del proveedor a mensajes controlados antes de mostrarlos en la UI.

## base de datos

- Coloca el esquema de la base de datos en archivos versionados de `supabase/migrations/`, registra todo cambio de esquema en una migración versionada y no ejecutes SQL suelto.
- Habilita RLS en toda tabla expuesta.
- Solicita confirmación antes de ejecutar cualquier comando que acceda a la base de datos o instale dependencias.
