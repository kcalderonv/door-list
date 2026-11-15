# Refactor conforme a AGENTS.md

Se revisaron los seis hallazgos existentes en docs/auditoria.md, seg?n el alcance acordado.

| Hallazgo | Resultado |
| --- | --- |
| 1. Divisi?n general del organizador | Fuera de alcance porque ninguna regla exige dividir la p?gina. Se extrajeron ?nicamente clientes, consultas y helpers cubiertos por reglas concretas. |
| 2. Ubicaci?n de consultas | Aplicado: consultas compartidas en lib/, clientes en lib/supabase/ y eliminaci?n de reexportaciones de rutas. |
| 3. Errores desiguales | Aplicado: API con c?digos HTTP, errores JSON controlados y traducci?n de errores del organizador. |
| 4. Limpieza con finally | Fuera de alcance porque ninguna regla lo cubre. |
| 5. Ambig?edad de Ticket | Aplicado: TicketType/PublicTicketType para opciones y Ticket para la entrada emitida. |
| 6. EmailDelivery duplicado | Aplicado: definici?n ?nica en lib/contracts.ts. |

La traducci?n de respuestas de persistencia est? en lib/supabase/mappers.ts. El casing de JSON no cambia columnas, argumentos RPC ni par?metros de ruta.

Los formatos p?blicos y del correo eran equivalentes: se conserv? es-PE, fecha completa, hora corta y America/Lima. El organizador usaba la zona local del navegador y estilos distintos: se conservaron como variantes expl?citas de lib/dates.ts para no alterar fechas mostradas ni editadas.

Se mantienen las fronteras cliente existentes para estado, eventos del formulario, autenticaci?n de Supabase en navegador y recuperaci?n de errores. Las p?ginas p?blicas siguen siendo Server Components.

POST /api/registros recibe eventId, ticketTypeId, name y email. Devuelve 201 tras confirmar la emisi?n; 400 para JSON inv?lido, 422 para campos inv?lidos, 404 para evento cerrado/no disponible, 409 para cupo agotado/tipo retirado/duplicado y 500 para fallos inesperados. Los errores tienen ?nicamente { error: string }, con c?digos estables traducidos en el cliente. GET /api/eventos/[id] permite actualizar disponibilidad. Un fallo de correo no invalida el registro.

La nueva migraci?n renombra tickets_types a ticket_types, sus constraints e ?ndices asociados y actualiza las funciones dependientes. Conserva pol?ticas, permisos y claves for?neas por identidad de tabla, y mantiene RLS. No se modificaron migraciones hist?ricas ni se ejecut? la migraci?n: debe aplicarse antes de desplegar el c?digo que usa ticket_types, previa confirmaci?n del propietario.

No se a?adieron dependencias ni casos de prueba, no se movieron componentes y no se modific? globals.css. Se conservaron los cambios previos del usuario fuera de los commits del refactor.
