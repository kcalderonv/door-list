# Revisión de diseño de la entrada

Objetivo: `app/entradas/[code]/page.tsx`.

Método: dos evaluaciones independientes con `impeccable critique`, aplicando el contrato visual de Door List. La revisión de código obtuvo una puntuación heurística provisional de 24/40. El detector del TSX devolvió `[]` (0 hallazgos); ese resultado no valida los estilos dependientes ni sustituye la revisión de diseño.

Limitación: no se verificó el resultado en navegador porque su inicialización falló en el entorno. Los hallazgos se basan en el código; la ubicación del QR dentro de la pantalla y su impacto visual quedan pendientes de comprobación. No se accedió a la base de datos ni se modificaron archivos de la aplicación.

| # | hallazgo | archivo:línea | decisión | razón |
| --- | --- | --- | --- | --- |
| 1 | **P1.** El QR aparece después de cinco bloques de metadatos, relegando la credencial necesaria para ingresar. | `app/entradas/[code]/page.tsx:21` | Aceptar: mostrar el QR después del nombre del evento y antes de los detalles. | Facilita localizar la credencial al ingresar. |
| 2 | **P2.** Una entrada utilizada conserva el QR con la misma presentación que una válida, aunque el texto indica que ya no permite ingresar. | `app/entradas/[code]/page.tsx:28` | Aceptar: ocultar el QR y mostrar claramente el estado utilizado. | Evita presentar como disponible una credencial que ya no permite ingresar. |
| 3 | **P2.** Una entrada revocada conserva el QR con la misma presentación que una válida, aunque el texto indica que no permite ingresar. | `app/entradas/[code]/page.tsx:28` | Aceptar: ocultar el QR y mostrar claramente el estado revocado. | Evita confundir una entrada revocada con una válida. |
| 4 | **P2.** La indicación «Guárdalo» no se acompaña de una acción ni de instrucciones concretas para guardar el enlace privado. | `app/entradas/[code]/page.tsx:33` | Aceptar: añadir un botón para copiar el enlace e instrucciones breves. | Ofrece una acción concreta para conservar el enlace privado. |
| 5 | **P2.** El mensaje de entrada utilizada no indica qué hacer si la persona considera que ese estado es incorrecto. | `lib/tickets.ts:25` | Aceptar: indicar que contacte al organizador si necesita ayuda. | Proporciona un siguiente paso para consultar un estado que considera incorrecto. |
| 6 | **P2.** El mensaje de entrada revocada no indica qué hacer si la persona considera que ese estado es incorrecto. | `lib/tickets.ts:26` | Aceptar: indicar que contacte al organizador si necesita ayuda. | Orienta a la persona para aclarar la revocación de su entrada. |
| 7 | **P2.** «Entrada no encontrada» no ofrece un siguiente paso cuando la persona ya comprobó que el enlace está completo. | `app/entradas/[code]/not-found.tsx:4` | Aceptar: indicar que contacte al organizador si necesita ayuda. | Ofrece una vía de ayuda cuando comprobar el enlace no resuelve el problema. |
| 8 | **P3.** Los colores del estado válido se definen mediante valores locales pese a existir tokens semánticos equivalentes. | `app/globals.css:27` | Aceptar: reutilizar los tokens semánticos compartidos de Door List. | Mantiene la coherencia visual y facilita el mantenimiento de los colores de estado. |
| 9 | **P3.** Los colores del estado utilizado se definen mediante valores locales pese a existir tokens semánticos equivalentes. | `app/globals.css:28` | Aceptar: reutilizar los tokens semánticos compartidos de Door List. | Mantiene la coherencia visual y facilita el mantenimiento de los colores de estado. |
| 10 | **P3.** Los colores del estado revocado se definen mediante valores locales pese a existir tokens semánticos equivalentes. | `app/globals.css:29` | Aceptar: reutilizar los tokens semánticos compartidos de Door List. | Mantiene la coherencia visual y facilita el mantenimiento de los colores de estado. |
| 11 | **P3.** El badge de estado mantiene una receta local de padding, radio y tamaño tipográfico en lugar de consumir el contrato compartido de estados. | `app/globals.css:26` | Aceptar: reutilizar el contrato compartido de estilos de estado de Door List. | Unifica la presentación de los estados y evita duplicar reglas de estilo. |
