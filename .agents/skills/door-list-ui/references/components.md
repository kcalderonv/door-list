# Recetas de composición

Estas recetas fijan decisiones para cambios futuros. Los nombres son contratos propuestos, no un inventario de exports existentes. En una implementación, adaptar componentes existentes antes de crear otros equivalentes.

## Paleta y tipografía

Los valores exactos están en [app/ui-tokens.css](../../../../app/ui-tokens.css). Usar `canvas` en la página, `surface` en tarjetas y paneles, `text` para lectura y `text-muted` para información secundaria. Usar `primary` y `on-primary` en la acción principal. El naranja `accent` es decorativo; no usarlo como texto pequeño ni para indicar error, éxito o selección.

El borde de control se normalizó a `#7b8da3` para alcanzar 3.40:1 sobre `surface`; el valor propuesto anterior no alcanzaba 3:1. Esta corrección de accesibilidad se mantiene en el token canónico y se aplica a ambos formularios.

| Rol | Familia | Tamaño | Peso | Interlineado |
| --- | --- | --- | --- | --- |
| Título de página | heading | page-title | regular | page-title |
| Título de sección | heading | section-title | regular | heading |
| Título de tarjeta | body | card-title | strong | heading |
| Texto y controles | body | body | regular; strong para acciones | body |
| Texto secundario | body | small | regular | body |
| Ayuda y etiquetas auxiliares | body | caption | regular | body |

Aplicar `tracking-heading` solo a títulos con la familia heading. Mantener la jerarquía HTML por significado: un h2 de tarjeta puede usar el rol visual de título de tarjeta. No aplicar estilos de hero a todos los h1 globalmente.

## Distribución y espaciado

| Contexto | Receta exacta |
| --- | --- |
| Contenedor de nuevas pantallas | Ancho máximo `container-max`, centrado; margen lateral `space-5` hasta 799px y `space-10` desde 800px |
| Sección | Padding vertical `space-8` hasta 799px y `space-12` desde 800px |
| Grid de eventos | Una columna hasta 799px; dos desde 800px; separación `space-6`; columnas `minmax(0, 1fr)` |
| Tarjeta o panel | Padding `space-6`; borde `border-width` + `border`; radio `radius-card`; fondo `surface`; sombra `shadow-card` |
| Contenido dentro de tarjeta | Flujo vertical con gap `space-4`; metadatos con gap `space-2` |
| Grupos de formulario | Gap `space-6`; etiqueta y control separados por `space-2` |
| Fila de acciones | Flex con wrap y gap `space-3`; acción principal primero en DOM |

Los breakpoints son constantes CSS de esta receta: no introducir variantes 768/820 para resolver el mismo cambio de columnas. Mantener el orden de lectura al cambiar de tamaño. Usar `min-width: 0` y `overflow-wrap: anywhere` donde títulos o datos largos puedan desbordarse. No truncar datos esenciales.

## Componentes y contratos

| Componente conceptual | Entradas | Responsabilidad |
| --- | --- | --- |
| EventCard | Event o modelo de presentación existente y destino real | Título, fecha mediante helper de `lib/`, lugar y enlace de registro |
| EmptyState | title, description, action opcional | Ausencia confirmada; título y explicación; como máximo una acción contextual |
| CardSkeleton | Sin datos; estructura de la tarjeta | Bloques decorativos de geometría estable durante carga inicial |
| Field | id, label, help opcional, error opcional, control | Asociar label/control y ayuda/error mediante id |
| Button | variant primary/secondary/danger, pending, disabled | Acción mediante button; navegación mediante enlace con apariencia equivalente |

Definir tipos compartidos en `lib/` únicamente cuando se compartan; mantener props de presentación locales junto al componente. No redefinir Event, TicketType, Ticket o Registration. La acción de EmptyState usa un enlace o un callback real del contexto: no fabricar un href genérico ni un manejador vacío.

Botones: altura mínima `control-min-height`, padding vertical `space-3` y horizontal `space-5`, radio `radius-control`, fuente body/strong. Primary usa primary/on-primary y primary-hover al pasar el puntero; secondary usa secondary/primary; danger usa error-surface/error-text. Foco visible con focus-width, focus y focus-offset en todas las variantes. Disabled usa opacity-disabled y conserva una indicación textual cuando la razón no sea obvia.

Campos: altura mínima `control-min-height`, padding `space-3`, borde control-border, fondo surface y radio control. Error usa error-text en mensaje y borde, `aria-invalid` y `aria-describedby`. No depender solo del color.

## Estados deterministas

Orden de resolución: carga inicial sin datos → error sin datos → vacío confirmado → contenido. Una actualización con datos previos conserva el contenido, marca la región ocupada y muestra un aviso si falla. No mostrar un vacío hasta confirmar que la consulta terminó correctamente con cero resultados.

| Estado | Apariencia y semántica | Texto de referencia |
| --- | --- | --- |
| Vacío público | Panel info-surface/info-border, padding space-8, radio card; copy con máximo empty-copy-max; sin CTA de organización | «Pronto habrá nuevos encuentros». «Por ahora no hay eventos con registro abierto. Vuelve a visitarnos.» |
| Vacío organizador | Mismo panel; una acción primaria si dispone de permiso y creación implementada | «Aún no tienes eventos». «Crea tu primer evento para empezar a recibir registros». Acción: «Crear evento» |
| Búsqueda vacía | Mismo panel; acción para limpiar filtros solo cuando existan filtros activos | «No encontramos eventos». «Prueba con otros filtros». Acción: «Limpiar filtros» |
| Carga inicial de lista | Tres CardSkeleton con el mismo grid y padding que EventCard; región aria-busy; un único mensaje role=status fuera de la región ocupada | «Cargando eventos…» |
| Envío pendiente | Conservar el texto y ancho suficiente del botón; impedir doble envío; avisar mediante role=status | «Guardando…» o «Registrando…», según la operación |
| Error sin datos | Panel error-surface/error-text; mensaje controlado y role=alert para fallo dinámico; acción solo si reintentar funciona | «No pudimos cargar los eventos». «Inténtalo nuevamente en unos momentos». Acción: «Volver a intentar» |

Skeleton estático: bloques con color-skeleton, radio control, sin shimmer ni animación. Cada tarjeta incluye título de dos líneas (`2 * text-card-title * leading-heading`), dos líneas de metadatos (`2 * text-body * leading-body`) y bloque de acción de altura control-min-height, separados por space-4. Bloques `aria-hidden=true`; no repetir anuncios por tarjeta. No añadir esperas artificiales.

Los vacíos iniciales no requieren aria-live. Para un cambio dinámico, anunciar un resumen breve con role=status. Iconos decorativos usan aria-hidden. Si el contexto cambia de eventos a registros, adaptar los sustantivos sin confundir Registration con Ticket.

## Ejemplo reproducible: tarjeta

Orden fijo: título → fecha y lugar → acción. La semántica es un article con nombre accesible asociado al título. La fecha usa time y un helper existente. La acción es «Registrarme» si el destino y la disponibilidad existen; una tarjeta informativa sin registro no muestra una acción ficticia.

```css
/* Estilos de ejemplo: aplicar al componente real, evitando duplicados. */
.event-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-6);
  color: var(--color-text);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.event-card-title {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-body);
  font-size: var(--text-card-title);
  font-weight: var(--weight-strong);
  line-height: var(--leading-heading);
}
```

## Ejemplos que deben rechazarse

- Nueva tarjeta con `background: #fafafa`, padding 22px o radio 14px: sustituir por los tokens de la receta; que esos valores existan en CSS legado no los convierte en variantes nuevas.
- Nueva fuente para la pantalla de entradas: conservar las familias del layout.
- Mostrar «No hay eventos» mientras la consulta está pendiente: renderizar carga.
- Botón «Crear evento» en vacío público: usar el texto público sin CTA.
- Skeleton con datos falsos interactivos o anuncios por cada bloque: usar bloques decorativos y un anuncio único.
- Añadir `"use client"` al contenedor para aplicar estilos: mantenerlo en servidor.
