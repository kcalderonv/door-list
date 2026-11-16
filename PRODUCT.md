# Door List

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Door List se dirige al público general, sin limitarse a un tipo de evento, comunidad o sector. Alcance confirmado por el usuario durante la inicialización.

El producto existente atiende dos roles: organizadores que publican y administran eventos y asistentes que descubren eventos y se registran sin crear una cuenta.

## Product Purpose

Permitir publicar eventos, gestionar sus cupos y registros y entregar a cada persona registrada una entrada con QR. El recorrido público conecta el descubrimiento de un evento con la confirmación del registro y la consulta de la entrada.

## Positioning

El diferenciador frente a otros productos queda pendiente de definición. No atribuir a Door List ventajas competitivas, cifras de uso ni resultados que no estén documentados.

## Operating Context

- La portada `/` muestra eventos publicados con registro abierto y enlaza a `/eventos/<id>/registro`.
- Los organizadores acceden con correo y contraseña a `/organizador`, donde administran sus eventos y tipos de entrada y consultan asistentes, ocupación e historial de registros.
- El asistente selecciona un tipo de entrada e introduce nombre y correo. Un registro nuevo confirmado emite una entrada y muestra su enlace privado en `/entradas/<código>`.
- El correo de confirmación incluye los datos del evento y el QR cuando el transporte de correo está configurado y habilitado. Un fallo de correo no anula el registro confirmado.
- Los datos del evento se presentan con referencia a `America/Lima`. El registro permanece abierto hasta terminar el día del evento en Lima, sujeto a publicación y disponibilidad.

## Capabilities and Constraints

Las capacidades descritas reflejan el repositorio existente y su README; esta inicialización no verifica un despliegue ni el estado de sus migraciones.

- Mantener entidades distintas: `Event` representa el evento; `TicketType`, una modalidad de entrada y su cupo; `Registration`, la inscripción de una persona; `Ticket`, la entrada emitida para esa inscripción.
- Un correo puede tener un único registro por evento. La confirmación vuelve a comprobar disponibilidad y emite registro y entrada en una transacción.
- El enlace de entrada es una credencial privada. No revelar una entrada existente únicamente por conocer el correo de una persona.
- Abrir la entrada o escanear su QR no consume la entrada. El repositorio documenta estados de entrada, pero no ofrece una interfaz de control de ingreso.
- El envío de correo es inmediato y depende de la configuración; no hay cola ni reintentos automáticos. La recuperación de enlaces perdidos con verificación de identidad queda pendiente.
- El panel solo debe exponer información de los eventos del organizador autenticado. Proteger datos de asistentes y entradas mediante RLS y permisos.
- La interfaz y las rutas públicas usan español; código, identificadores y tipos usan inglés. Los contratos de API usan camelCase y la persistencia usa tablas plurales en snake_case.
- Mantener tipos y helpers compartidos en `lib/` y clientes de Supabase en `lib/supabase/`. Usar Server Components por defecto y justificar cualquier ejecución en cliente.
- Antes de escribir código de Next.js, consultar la documentación de la versión instalada en `node_modules/next/dist/docs/`; puede diferir de versiones conocidas.
- Registrar cambios de esquema en migraciones versionadas de `supabase/migrations/`. Solicitar confirmación antes de acceder a la base de datos o instalar dependencias, conforme a `AGENTS.md`.
- No se ha definido un objetivo cuantitativo de éxito ni un modelo comercial. No presentar pagos o venta de entradas como capacidades confirmadas.

## Brand Commitments

El nombre existente es Door List. Los textos de interfaz están en español. La identidad visual vigente tiene su contrato en `.agents/skills/door-list-ui/SKILL.md` y sus valores canónicos en `app/ui-tokens.css`; esta inicialización no modifica ese contrato.

## Evidence on Hand

- `README.md`: alcance funcional, recorridos, requisitos de configuración y limitaciones de registro, emisión y correo.
- `app/`: portada, panel de organizador, registro público y consulta de entradas.
- `lib/contracts.ts`, `lib/tickets.ts` y `lib/dates.ts`: contratos de dominio y formato compartido.
- `supabase/migrations/`: historial versionado del esquema; su presencia no confirma su aplicación en una base de datos.
- `tests/` y `scripts/`: comprobaciones locales y de integración; no ejecutadas durante esta inicialización.

No se han aportado testimonios, clientes, cifras de adopción ni estudios de resultados para utilizar como prueba comercial.

## Product Principles

- Servir a un público general sin asumir un sector o tipo de evento concreto.
- Facilitar el registro público sin exigir una cuenta de asistente.
- Respetar cupos y distinguir el registro de la entrada emitida y su estado.
- Proteger los datos de asistentes y el acceso privado a las entradas.
- Comunicar estados y errores en español con mensajes controlados y fechas claramente referidas a Lima.
