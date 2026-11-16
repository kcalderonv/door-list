---
name: Door List
description: "Un lugar para encontrarnos: claro, cercano y casi plano."
colors:
  primary: "#132f59"
  primary-hover: "#204b80"
  on-primary: "#ffffff"
  secondary: "#e4eef9"
  accent: "#ed8b42"
  canvas: "#f3f6fa"
  surface: "#ffffff"
  text: "#102447"
  text-muted: "#50627b"
  border: "#dce5ef"
  control-border: "#7b8da3"
  focus: "#007c91"
  info-surface: "#e4f2f7"
  info-border: "#c8e3eb"
  info-text: "#14525f"
  success-surface: "#e5f2e9"
  success-text: "#20553d"
  warning-surface: "#fff4e1"
  warning-text: "#754314"
  error-surface: "#fdece9"
  error-text: "#a32d22"
  skeleton: "#e4eef9"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.75rem, 8vw, 5.375rem)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.5
  small:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "0.5rem"
  card: "1rem"
  pill: "999px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.25rem"
  space-6: "1.5rem"
  space-8: "2rem"
  space-10: "2.5rem"
  space-12: "3rem"
  space-16: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  button-danger:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error-text}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.75rem"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "1.5rem 0"
  status-published:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
  status-draft:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning-text}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  date-tile:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0.5rem"
---

# Design System: Door List

## Overview

**Creative North Star: "Un lugar para encontrarnos"**

Door List se describe como cercano, claro y ordenado. Los títulos con serif aportan personalidad; el texto y los controles sin serif facilitan leer y completar tareas. El azul marino profundo sostiene la identidad y el naranja cálido aparece como detalle decorativo.

La profundidad es casi plana: predominan los fondos claros y los bordes, con una sombra secundaria en tarjetas y paneles. Los componentes son claros y cercanos, con formas suaves y acciones fáciles de reconocer. Estas descripciones fueron confirmadas por el usuario; no constituyen un rediseño.

**Key Characteristics:**

- Títulos expresivos con Fraunces y controles legibles con DM Sans.
- Azul marino profundo, superficies claras y naranja cálido decorativo.
- Jerarquía por espacio, tipografía, fondos y bordes; sombra secundaria.
- Componentes claros y cercanos, con esquinas suaves y estados explícitos.

Registro extraído de `app/ui-tokens.css`, `app/door-list.css`, `app/globals.css`, `app/layout.tsx` y los componentes de las rutas actuales. Los valores del frontmatter documentan los tokens de ejecución; `app/ui-tokens.css` sigue siendo su fuente canónica y la skill `door-list-ui` conserva sus recetas. Actualizar esta captura cuando cambie esa fuente. No se realizó comprobación visual en navegador ni se encontraron capturas de referencia en el escaneo del repositorio; las observaciones de apariencia se basan en el código.

Estructura documental basada en la [especificación de DESIGN.md](https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md). `.impeccable/design.json` añade metadatos, sombra, breakpoints y ejemplos HTML/CSS sin runtime de framework. Sus rampas OKLCH son muestras sintetizadas únicamente para previsualización: no amplían la paleta de ejecución. Los ejemplos heredan las variables CSS del proyecto y sus fuentes cargadas; sus datos entre corchetes son marcadores, no contenido comercial.

## Colors

La paleta combina un marino profundo con neutros fríos claros; el naranja aporta calidez sin asumir funciones de estado.

### Primary

- **Azul marino profundo** (`primary`): acciones principales y enlaces de acción; `primary-hover` aclara el botón al pasar el puntero y `on-primary` mantiene su texto blanco.
- **Azul suave** (`secondary`): acciones secundarias, contadores, mosaicos de fecha y selección de tipos de entrada.

### Secondary

- **Naranja cálido** (`accent`): punto del logotipo y formas decorativas del acceso al panel. No es el color de los botones principales.

### Neutral

- `canvas` y `surface`: fondo general gris azulado y superficies blancas de contenido.
- `text` y `text-muted`: lectura principal en tinta azul y metadatos de menor jerarquía.
- `border` y `control-border`: separación suave de contenido y borde más visible para campos.
- `skeleton`: bloques estáticos de carga, sin datos simulados.

### Estados y foco

- `focus`: contorno de teclado, selección de tarjeta y barras de aforo.
- `info-surface`, `info-border`, `info-text`: vacíos, resúmenes y mensajes informativos.
- `success-surface`, `success-text`: publicado, entrada válida y confirmación.
- `warning-surface`, `warning-text`: borrador, avisos y entrada utilizada.
- `error-surface`, `error-text`: errores, acciones destructivas y entrada revocada.

**The Decorative Orange Rule.** Reservar el naranja para decoración; no usarlo como texto pequeño ni como indicador de éxito, error o selección.

## Typography

**Display Font:** Fraunces, con Georgia y serif como respaldo.

**Body Font:** DM Sans, con Arial y sans-serif como respaldo. Las dos familias están configuradas en `app/layout.tsx`; no hay una tercera familia de etiquetas.

La combinación aporta expresión en títulos y continuidad en lectura, formularios y acciones. No existe una escala de proporción única: se combinan tamaños fijos con un título de página fluido.

### Hierarchy

- **Display:** título de página del panel y registro; usa el rol `display` del frontmatter.
- **Headline:** secciones y títulos de tarjetas públicas; usa `headline`.
- **Title:** títulos de tarjetas del organizador y subtítulos operativos; usa `title`.
- **Body / Action:** texto y controles; las acciones usan el peso fuerte de `action`.
- **Label / Small / Caption:** etiquetas de campo, notas y ayudas. Los antetítulos y badges usan el tamaño caption con peso fuerte.

### Variaciones existentes por superficie

La portada mantiene valores locales en `app/globals.css`: su h1 usa `clamp(44px, 8vw, 86px)`, interlineado 1.03 y tracking heredado de -0.065em. La regla global para h1 conserva además un máximo de 700px; los títulos de panel y registro tienen tracking propio. El h1 de entrada emitida usa `clamp(32px, 7vw, 48px)` e interlineado 1.15. La portada y sus descripciones usan interlineado 1.7 en varios párrafos. Son diferencias actuales, no nuevas variantes de la escala compartida.

**The Two Families Rule.** Reutilizar Fraunces para títulos y DM Sans para lectura y controles, sin añadir familias por pantalla.

## Layout

La receta compartida centra el contenido con máximo de 77.5rem. Los márgenes laterales son 1.25rem hasta 799px y 2.5rem desde 800px. Las secciones principales pasan de 2rem a 3rem de padding vertical. El formulario de acceso tiene máximo de 28rem y el texto de vacío, de 24rem.

El listado de eventos pasa de una columna a dos desde 800px, con separación de 1.5rem. Al abrir el formulario del organizador en escritorio, lista y formulario comparten dos columnas y la lista vuelve a una. El registro utiliza una columna en móvil y proporciones 1.2fr / 1fr en escritorio. Las acciones permiten salto de línea y los contenedores de datos largos admiten ajuste de palabras.

El ritmo compartido parte de pasos de 0.25rem; el frontmatter enumera los pasos existentes. Las tablas de asistentes conservan desplazamiento horizontal local cuando hace falta, en vez de ampliar toda la página.

La portada conserva un máximo local de 1360px y padding lateral de 6%; sus tarjetas tienen padding de 26px. Sus columnas también cambian a 800px. El CSS legado contiene un breakpoint adicional de 760px para la composición antigua; no es el breakpoint de las recetas compartidas. La entrada emitida tiene máximo local de 640px y el QR, de 280px.

## Elevation & Depth

El sistema es **casi plano**, según la preferencia confirmada. Fondo, borde y espaciado establecen la separación principal. La sombra compartida de tarjetas y paneles es tenue y ambiental (`0 12px 40px #10244708`); existe también en las tarjetas públicas. No hay una escala de elevaciones ni un efecto de elevación al pasar el puntero en las recetas examinadas.

**The Secondary Shadow Rule.** Mantener la sombra como separación secundaria; la jerarquía principal corresponde a fondos, bordes y tipografía.

## Shapes

Controles con esquinas suaves, tarjetas más redondeadas y píldoras para estados y contadores: roles `control`, `card` y `pill` del frontmatter. Los bordes compartidos tienen grosor de 1px. Los botones de cierre son circulares y las fechas se alojan en rectángulos suavizados.

La portada conserva un radio local de 14px para mensajes y la entrada emitida usa badges rectangulares con radio de 8px. Documentar esas diferencias no las convierte en recetas nuevas para futuras pantallas.

## Components

Los siguientes son patrones implementados, no una biblioteca de componentes React exportados. `CardSkeleton` sí existe en `components/card-skeleton.tsx`; gran parte de las demás composiciones vive junto a sus rutas.

### Buttons

Claros y cercanos. La receta compartida usa radio de control, altura mínima de 3rem, padding vertical de 0.75rem y horizontal de 1.25rem; fuente de acción y texto centrado.

- **Primary:** marino con texto blanco; cambia a `primary-hover` al pasar el puntero.
- **Secondary:** fondo azul suave con texto marino; mantiene ese fondo en hover.
- **Text:** fondo transparente y texto marino; hover con fondo secundario.
- **Danger:** fondo de error suave con texto de error; hover añade borde de error.
- **Focus:** outline de 3px con `focus` y separación de 4px en el contexto compartido.
- **Disabled:** opacidad 0.6 y cursor por defecto. El envío conserva texto explícito, por ejemplo «Registrando…».

No se ha definido una animación, transición ni transformación de pulsación para estos botones.

### Cards / Containers

Superficie blanca, borde suave, radio de tarjeta, padding de 1.5rem y sombra ambiental secundaria. La tarjeta seleccionada del organizador usa borde y outline con el color de foco. Las tarjetas públicas conservan su padding local indicado en Layout y títulos Fraunces; las del organizador usan títulos DM Sans fuertes.

### Inputs / Fields

Fondo blanco, borde de control, radio suave, padding de 0.75rem y altura mínima de 3rem. Las etiquetas visibles preceden al campo; notas y errores aparecen debajo. Los campos de registro con `aria-invalid` cambian el borde al color de error y asocian el mensaje mediante `aria-describedby`. El foco comparte el contorno de los botones. Los campos deshabilitados del registro usan el fondo canvas; no asumir que todas las pantallas tienen idéntica cobertura de validación.

### Chips / Status

Badges informativos, no filtros: publicado usa la pareja de éxito y borrador la pareja de aviso. Tienen forma de píldora, padding de 0.25rem / 0.5rem y tamaño caption fuerte. El estado de una entrada emitida usa su variante rectangular y siempre incluye texto; el color no reemplaza la etiqueta.

### Navigation

Cabecera flexible con marca a la izquierda y acción contextual a la derecha; permite wrap y termina en un borde inferior suave. El punto naranja identifica la marca. La cabecera compartida usa padding vertical de 1.5rem; la portada mantiene 30px y su marca de 26px/peso 800. Los enlaces del panel reciben la receta de acción; la portada tiene enlace de acceso con altura mínima de 44px. No hay menú lateral ni pestañas de navegación en las rutas examinadas.

### Date Tile, Capacity and Registration History

El mosaico de fecha mide al menos 4rem por lado, usa fondo secundario y destaca el día con Fraunces. El aforo combina cifras y barras con el color de foco. El historial usa línea marina, rejilla suave y ejes con números tabulares; dispone de tabla desplegable para consultar los mismos datos.

### Ticket Selection and Issued QR

Las opciones de tipo de entrada usan radios nativos dentro de filas con borde y altura mínima de 4rem. La selección cambia fondo y borde; las opciones agotadas permanecen identificadas por texto y deshabilitadas. La entrada emitida conserva el QR negro sobre blanco, con zona de silencio y código visible debajo; el acento decorativo no interviene en él.

### Empty, Loading and Error

Los vacíos compartidos usan la familia informativa y padding de 2rem. El público anuncia próximos encuentros; el organizador puede mostrar «Crear evento». Los errores usan mensajes controlados y acciones de reintento existentes. La carga utiliza skeletons estáticos con bloques decorativos, sin shimmer; los estados dinámicos conservan avisos de texto. Las recetas indican conservar datos previos durante actualizaciones y no mostrar un vacío hasta confirmar una respuesta sin resultados.

## Do's and Don'ts

### Do:

- **Do** consumir los tokens de `app/ui-tokens.css` y las recetas de `door-list-ui` para nuevas pantallas.
- **Do** mantener títulos Fraunces y lectura y controles DM Sans con roles de jerarquía explícitos.
- **Do** conservar el foco visible y acompañar estados, errores y disponibilidad con texto.
- **Do** permitir wrap de acciones y datos largos y mantener la lectura en una columna en móvil.
- **Do** distinguir el estado de carga del vacío confirmado y del error.

### Don't:

- **Don't** usar el naranja decorativo como texto pequeño o indicador de estado o selección.
- **Don't** convertir valores locales de CSS legado en nuevas variantes del sistema compartido.
- **Don't** añadir familias tipográficas, bibliotecas de iconos o animación de skeleton por pantalla.
- **Don't** convertir nombres de patrones conceptuales en afirmaciones de componentes exportados que no existen.
- **Don't** sustituir la jerarquía de fondos, bordes y tipografía por sombras protagonistas.
