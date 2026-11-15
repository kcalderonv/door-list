# Exportación de asistentes

En `/organizador`, abrir **Ver evento**. **Ventas y disponibilidad** muestra
las entradas vendidas, el cupo y cuánto falta por vender por tipo. Debajo,
**Asistentes** incluye la tabla y **Descargar CSV**. La descarga se genera en
el dispositivo después de actualizar la consulta autenticada; también
funciona con cero asistentes.

El historial de registros aparece después de asistentes. La configuración
de tipos de entrada queda al final; su **Aforo sin asignar** indica los
lugares aún no distribuidos entre tipos, no las entradas pendientes de venta.

## Preparación de la base de datos

Aplicar mediante el flujo habitual de migraciones
`supabase/migrations/20261119000000_organizer_attendance_export.sql`.
Requiere confirmación explícita antes de ejecutar comandos de base de datos.
Sin esta migración, el botón aparece deshabilitado y la consulta muestra un
error controlado; usar **Actualizar registros** después de aplicarla.

La nueva función usa `security invoker`, grants de columnas y policies RLS de
lectura para la dueña. No concede lectura del hash ni permisos de escritura.
No cambia las policies anteriores ni el flujo público de registro.

`door_code` es una referencia de puerta UUID, creada para tickets anteriores
y futuros. Es independiente del secreto del QR; el secreto original solo
existe como hash y no puede recuperarse. El CSV y la tabla usan la misma
referencia. No sirve para abrir la URL pública del ticket.

`sales_status` representa el estado comercial (`active`, `cancelled`,
`refunded`), separado del estado de acceso existente (`valid`, `used`,
`revoked`). Exportación y ventas incluyen únicamente tickets activos válidos
o utilizados. Esta pantalla no incorpora acciones de cancelación o reembolso.
La selección de tickets y el cálculo compartido viven en `lib/attendance.ts`;
`lib/export/` contiene la generación del archivo y su descarga.

La presentación admite cupos nulos y muestra «sin límite» sin barra en ese
caso. El esquema actual exige cupos definidos; esta funcionalidad conserva
esos cupos y no añade una configuración de entradas ilimitadas ni cambia las
comprobaciones del registro público.

El nombre del archivo deriva el slug del título y usa el día de Lima:
`asistentes-{slug}-{YYYY-MM-DD}.csv`. Las fechas de compra usan el helper
compartido de Lima. CSV UTF-8 con BOM, comas y CRLF; sin dependencias nuevas.

## Validación y reversión

`npm test` comprueba generación, descarga, exclusiones, cupos y manejo de
acceso denegado con dobles de prueba. La prueba real de RLS está en
`tests/attendees-rls.sql`: ejecutar con psql y `ON_ERROR_STOP=1` solo en una
base de pruebas migrada, previa confirmación. Crea fixtures y los revierte al
terminar; ejecuta las consultas como `authenticated`, sin clave service role.

`tests/attendees-rls-readonly.sql` verifica una base ya migrada sin crear
fixtures: comprueba historial, permisos, acceso de la dueña y denegación de
otra usuaria en una transacción de solo lectura. Devuelve únicamente el
resultado de las comprobaciones, nunca datos de asistentes. También requiere
autorización antes de ejecutarse.

Para revertir, retirar primero la integración de UI y aplicar el archivo
`supabase/rollbacks/20261119000000_organizer_attendance_export.sql` con
confirmación. El rollback elimina únicamente los metadatos y permisos de
esta funcionalidad; conserva registros, tickets, hashes y policies previas.
Se pierden los códigos de puerta y estados comerciales añadidos por ella.
