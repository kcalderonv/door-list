# Door List

## Panel de organizador

Copia `.env.example` a `.env.local` y configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la URL y la clave publicable (o anon) del proyecto Supabase. No uses la clave de servicio. Crea las cuentas de organizador en Supabase Auth y habilita el acceso con correo y contraseña. Inicia la aplicación y abre `/organizador`.

La base de datos debe tener aplicadas, en orden, las migraciones de `supabase/migrations`. La segunda migración añade el aforo del evento y las funciones transaccionales utilizadas por el panel. Antes de ejecutar cualquier comando que acceda a la base de datos o instale dependencias, solicita la confirmación indicada en `AGENTS.md`.

Las fechas se introducen en la zona horaria local del navegador y se almacenan como instantes UTC.

## Registro público

La tercera migración, `20261114000000_public_event_registration.sql`, añade las inscripciones y las RPC públicas. Aplícala antes de habilitar la nueva página. La configuración utiliza las mismas variables públicas de Supabase; no requiere una clave de servicio ni dependencias adicionales.

Cada evento publicado tiene una página en `/eventos/<id>/registro`, enlazada desde su tarjeta en el panel. El formulario se puede abrir y enviar sin cuenta. Solo admite eventos cuya fecha en `America/Lima` sea hoy o posterior: los registros cierran a medianoche de Lima después del día del evento, aunque la hora de inicio ya haya pasado. La portada se conserva.

Cada envío registra una persona en un tipo de entrada. Nombre y correo son obligatorios; el correo se guarda sin espacios exteriores y en minúsculas, con un único registro por evento. La página muestra entradas disponibles o agotadas. La confirmación comprueba nuevamente publicación, fecha, pertenencia de la entrada y cupos dentro de una única transacción con bloqueos del evento y la entrada. Si se agota un cupo, actualiza las opciones y conserva los datos para elegir otra entrada. Los fallos de conexión permiten reintentar con el mismo correo sin duplicar cupos.

Los datos de asistentes no se pueden consultar o modificar directamente con las claves públicas. Los eventos y entradas con inscripciones no se pueden eliminar, y sus aforos no pueden reducirse por debajo de lo ya ocupado. Para cerrar un evento a nuevas inscripciones, cambia su estado a borrador.

### Comprobaciones

Con Node.js 22.18 o posterior, ejecuta `npm test` para validar campos y fechas de Lima; `npm run lint`, `npx --no-install tsc --noEmit` y `npm run build` verifican el código. Estos comandos no deben consultar la base de datos; la ruta pública espera una solicitud antes de cargar datos. La compilación requiere acceso a Google Fonts.

El script `scripts/test-registration-integration.mjs` verifica en un proyecto Supabase de prueba la concurrencia por el último cupo, duplicados, filtros públicos, permisos y protecciones administrativas. Su ejecución requiere confirmación previa porque consulta y modifica la base de datos. Consulta su cabecera para las variables necesarias; crea sus propios eventos, elimina solo sus propios datos al terminar y no instala dependencias. No uses un proyecto de producción.

## SEO y despliegue

Configura `NEXT_PUBLIC_SITE_URL` con el origen público definitivo (por ejemplo, `https://tudominio.com`) antes de compilar para habilitar la URL canónica de la portada y el sitemap. Sin esta variable no se inventa un dominio y el sitemap queda vacío. El panel de organizador incluye `noindex`.

Las fuentes de texto de Google se descargan durante la compilación con `next/font` y se sirven desde el propio sitio. La compilación necesita acceso a Google Fonts; los iconos Material del panel se cargan desde Google en el navegador.
