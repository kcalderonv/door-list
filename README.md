# Door List

## Panel de organizador

Copia `.env.example` a `.env.local` y configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la URL y la clave publicable (o anon) del proyecto Supabase. No uses la clave de servicio. Crea las cuentas de organizador en Supabase Auth y habilita el acceso con correo y contraseña. Inicia la aplicación y abre `/organizador`.

La base de datos debe tener aplicadas, en orden, las migraciones de `supabase/migrations`. La segunda migración añade el aforo del evento y las funciones transaccionales utilizadas por el panel. Antes de ejecutar cualquier comando que acceda a la base de datos o instale dependencias, solicita la confirmación indicada en `AGENTS.md`.

Las fechas se introducen en la zona horaria local del navegador y se almacenan como instantes UTC.

### Registros y asistentes en Dashboard

El detalle incluye **Registros por día**, una gráfica de línea con tabla accesible y actualización independiente. Consume `GET /api/eventos/<id>/registros-por-dia` con el token de sesión en `Authorization: Bearer …`; requiere autenticación y solo permite consultar eventos propios. Las respuestas privadas no se almacenan en caché. El contrato compartido `RegistrationHistory` usa camelCase y cuenta registros, independientemente de sus tickets.

La migración `20261118000000_registration_history.sql` guarda la primera publicación del evento y agrega la RPC privada de agregación diaria. Incluye los días con cero registros hasta hoy en `America/Lima`, incluso después del evento. Volver a borrador y publicar conserva el inicio original. Para eventos anteriores, el primer registro conocido es una estimación indicada en pantalla; si no existe, se informa que falta la fecha histórica. La fecha del evento y la fecha de migración no se usan como sustitutos. `registration-history.tsx` requiere `"use client"` para obtener la sesión del navegador, consultar el endpoint y actualizar la gráfica; su SVG y estados reutilizan tokens y recetas de panel de `door-list-ui`, sin dependencias nuevas.

En `/organizador`, cada tarjeta de **Mis eventos** permite abrir **Ver evento**. El detalle muestra los registros sobre el aforo de cada tipo de entrada, el total del evento y los asistentes con nombre, correo, tipo de entrada y fecha de registro en Lima. **Actualizar registros** vuelve a consultar el detalle; los conteos incluyen todos los registros, sin depender del estado de los tickets emitidos. Se conservan la creación y edición de eventos y tipos de entrada.

Requiere aplicar `supabase/migrations/20261117000000_organizer_event_details.sql`, previa confirmación. La RPC `get_organizer_event_details` solo puede ejecutarse con el rol `authenticated` y comprueba que `auth.uid()` sea el dueño del evento. Devuelve `null` para eventos ajenos o inexistentes, incluidos los publicados. No concede acceso directo a `registrations` ni modifica RLS; tampoco devuelve códigos ni hashes de tickets. La consulta devuelve conteos y asistentes en una misma instantánea, sin el límite de filas de una consulta de tabla de PostgREST.

La página y el layout son Server Components. `organizer-dashboard.tsx` y `event-attendance.tsx` usan ejecución en cliente para la sesión de Supabase del navegador, formularios, selección de evento y actualización manual. Al cerrar sesión o cambiar de cuenta se descartan los datos privados y las respuestas pendientes de la cuenta anterior.

`npm test` verifica filtros de propietario, conversión a camelCase y errores con clientes simulados. El script de integración existente también comprueba acceso del dueño, rechazo anónimo y aislamiento frente a otro organizador para eventos publicados y borradores; necesita un proyecto de prueba, todas las migraciones y confirmación previa para ejecutarse.

## Registro público

La tercera migración, `20261114000000_public_event_registration.sql`, añade las inscripciones y las RPC públicas. Aplícala antes de habilitar la nueva página. La configuración utiliza las mismas variables públicas de Supabase; no requiere una clave de servicio ni dependencias adicionales.

Cada evento publicado tiene una página en `/eventos/<id>/registro`, enlazada desde su tarjeta en el panel. El formulario se puede abrir y enviar sin cuenta. Solo admite eventos cuya fecha en `America/Lima` sea hoy o posterior: los registros cierran a medianoche de Lima después del día del evento, aunque la hora de inicio ya haya pasado. La portada `/` lista los eventos publicados con registro abierto, ordenados por fecha, y enlaza a sus páginas de registro. Aplica la misma regla de fechas de Lima que usa el panel. El panel permanece en `/organizador`.

Cada envío registra una persona en un tipo de entrada. Nombre y correo son obligatorios; el correo se guarda sin espacios exteriores y en minúsculas, con un único registro por evento. La página muestra entradas disponibles o agotadas. La confirmación comprueba nuevamente publicación, fecha, pertenencia de la entrada y cupos dentro de una única transacción con bloqueos del evento y la entrada. Si se agota un cupo, actualiza las opciones y conserva los datos para elegir otra entrada. Los fallos de conexión permiten reintentar con el mismo correo sin duplicar cupos.

Los datos de asistentes no se pueden consultar o modificar directamente con las claves públicas. Los eventos y entradas con inscripciones no se pueden eliminar, y sus aforos no pueden reducirse por debajo de lo ya ocupado. Para cerrar un evento a nuevas inscripciones, cambia su estado a borrador.

### Comprobaciones

Con Node.js 22.18 o posterior, ejecuta `npm test` para validar campos y fechas de Lima; `npm run lint`, `npx --no-install tsc --noEmit` y `npm run build` verifican el código. Estos comandos no deben consultar la base de datos; la ruta pública espera una solicitud antes de cargar datos. La compilación requiere acceso a Google Fonts.

Después de compilar, `npm run test:http` comprueba el HTML de la página anónima, entradas agotadas, enlaces inválidos y eventos cerrados. Levanta un servidor temporal de producción con un servicio simulado en memoria y bloquea las demás solicitudes salientes; no accede a la base de datos ni detiene el servidor de desarrollo existente.

El script `scripts/test-registration-integration.mjs` verifica en un proyecto Supabase de prueba la concurrencia por el último cupo, duplicados, filtros públicos, permisos y protecciones administrativas. Su ejecución requiere confirmación previa porque consulta y modifica la base de datos. Consulta su cabecera para las variables necesarias; crea sus propios eventos y una cuenta temporal, elimina solo sus propios datos al terminar y no instala dependencias. No uses un proyecto de producción.

## Emisión de entradas

La migración `20261115000000_issue_tickets.sql` crea `tickets` y amplía `create_registration`: cada registro nuevo y su entrada se guardan en la misma transacción. El código se genera en PostgreSQL con 32 bytes criptográficamente aleatorios de `pgcrypto`, instalado en el esquema `extensions` de Supabase. Solo se almacena su hash SHA-256, único; la clave primaria `registration_id` impide emitir dos entradas para la misma inscripción. Un error de emisión revierte también el registro. Los registros anteriores a esta migración no se modifican ni reciben códigos retroactivamente.

La confirmación muestra **Ver mi entrada y QR**, con un enlace secreto `/entradas/<código>`. La página muestra nombre, correo, tipo de entrada, evento, QR y el estado actual (`valid`, `used`, `revoked`). El QR contiene el código, se genera localmente con `qrcode` y no se envía a servicios externos. Actualizar la página vuelve a consultar el estado; abrirla o escanear el QR no consume la entrada. Los cambios de estado quedan reservados a operaciones administrativas de confianza; no se añade una interfaz de control de ingreso.

La RPC `get_public_ticket` solo acepta el código hexadecimal completo de 64 caracteres y compara su hash por igualdad. Códigos malformados o inexistentes devuelven `null`; no hay consultas por correo, ID de registro ni prefijos. RLS y los permisos impiden listar o modificar tickets con roles públicos o de organizador. El enlace permite acceder a los datos a quien lo posea: debe guardarse como una credencial privada. Las respuestas usan `no-store`, `no-referrer` y `noindex`, y las entradas se excluyen de `robots.txt` y del sitemap. El alojamiento también debe omitir o redactar estos códigos en sus registros de acceso y herramientas de analítica.

Los reintentos, incluso simultáneos, conservan la unicidad por evento y correo. Una respuesta `ALREADY_REGISTERED` nunca devuelve el código existente: conocer el correo no autoriza a ver la entrada. Si se pierde la respuesta original tras confirmar, no se emite una segunda entrada; la recuperación del enlace requiere un futuro flujo que verifique la identidad del asistente.

`qrcode` y `@types/qrcode` están declarados en `package.json` y fijados en `package-lock.json`. Antes de habilitar la emisión, aplica la cuarta migración con la confirmación previa exigida por `AGENTS.md`. Las pruebas locales de `npm test` simulan el servicio y no acceden a la base de datos. El script de integración también verifica códigos únicos, estados, reintentos simultáneos y restricciones de consulta/escritura; requiere autorización y un proyecto Supabase de pruebas, y no se ejecuta durante la compilación.

Referencias: [aleatoriedad de pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html) y [generador QR local](https://github.com/soldair/node-qrcode).

## Correo de confirmación

Al confirmar un registro nuevo, la aplicación envía un correo con el nombre del evento, la fecha y hora de Lima, el lugar, el tipo de entrada y el QR incluido como imagen PNG visible en el mensaje. Estos datos se consultan desde la entrada confirmada; no dependen de valores enviados por el navegador. No hace falta abrir ningún enlace para verlos; el correo también incluye el enlace privado para consultar el estado actualizado. Solo se envía tras recibir la confirmación de emisión; un registro duplicado no reenvía correos ni revela códigos anteriores. Si SMTP rechaza el mensaje o la configuración está incompleta, el registro sigue confirmado y el usuario conserva su enlace en pantalla. El envío es inmediato, sin cola ni reintentos automáticos; la aceptación por SMTP no garantiza la entrega final al buzón.

Las variables de correo están en `.env.example` y se pueden completar en `.env.local`. No llevan el prefijo `NEXT_PUBLIC_`, por lo que las credenciales se utilizan solo en el servidor. El envío permanece desactivado con `MAIL_ENABLED=false` hasta que completes la configuración.

Para desarrollo, configura `MAILTRAP_SMTP_USER` y `MAILTRAP_SMTP_PASSWORD` desde **Mailtrap → Email Sandbox → Integration → SMTP**. El host predeterminado es `sandbox.smtp.mailtrap.io`, puerto `2525`, con STARTTLS. Completa también `MAIL_FROM_ADDRESS` y `MAIL_FROM_NAME`, conserva `APP_URL=http://localhost:3000` y cambia `MAIL_ENABLED=true`. Mailtrap Sandbox captura los mensajes para inspección; no los entrega al destinatario real. [Documentación de Mailtrap](https://docs.mailtrap.io/email-sandbox/setup/sandbox-smtp-integration).

En producción, el transporte predeterminado usa `SMTP_HOST=localhost` y `SMTP_PORT=25`, sin autenticación ni TLS, para un relay local que debes tener instalado y configurado. Si el relay está en otra máquina o contenedor, usa su dirección real: `localhost` siempre apunta al entorno donde corre Next.js. Puedes configurar `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` (TLS desde la conexión, normalmente puerto 465) y `SMTP_REQUIRE_TLS` (STARTTLS obligatorio). La verificación de certificados se conserva. [Opciones SMTP de Nodemailer](https://nodemailer.com/smtp).

`MAIL_TRANSPORT` vacío selecciona Mailtrap con `next dev` y SMTP con `next start`. Puedes fijarlo explícitamente a `mailtrap` o `smtp`, por ejemplo para usar el Sandbox en una instalación de pruebas con compilación de producción. `APP_URL` debe ser el origen público HTTPS en producción, por ejemplo `https://eventos.tudominio.com`; se usa para construir el enlace de la entrada y es independiente del host SMTP. Reinicia el servidor después de editar `.env.local`.

Las pruebas de `npm test` simulan SMTP y comprueban ambos transportes, validación de configuración, contenido HTML escapado, QR, fallos y protección de la confirmación. No envían correos reales ni acceden a la base de datos.

## SEO y despliegue

Configura `NEXT_PUBLIC_SITE_URL` con el origen público definitivo (por ejemplo, `https://tudominio.com`) antes de compilar para habilitar la URL canónica de la portada y el sitemap. Sin esta variable no se inventa un dominio y el sitemap queda vacío. El panel de organizador incluye `noindex`.

Las fuentes de texto de Google se descargan durante la compilación con `next/font` y se sirven desde el propio sitio. La compilación necesita acceso a Google Fonts; los iconos Material del panel se cargan desde Google en el navegador.
