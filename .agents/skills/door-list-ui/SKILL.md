---
name: door-list-ui
description: Aplica el estilo de Door List al crear, modificar o revisar pantallas, tarjetas, formularios y estados vacíos, de carga o de error de este repositorio. Úsalo para cambios visuales o de estructura de UI. No corresponde a tareas exclusivamente de API, base de datos, correo o lógica sin interfaz.
---

# UI de Door List

## Objetivo y alcance

Mantener la identidad existente: superficies claras, azul marino, DM Sans para lectura y controles, Fraunces para títulos y naranja como acento decorativo. Aplicar este contrato a la UI nueva o modificada dentro de la tarea. No iniciar una migración de todas las pantallas por activar el skill.

Los tokens están integrados en la aplicación; las recetas se aplican al modificar cada pantalla. No afirmar que los ejemplos son componentes existentes ni que este skill impone controles automáticos de CI.

## Fuentes y decisiones

1. Leer el `AGENTS.md` aplicable. Mantiene las reglas de arquitectura, idioma, Next.js y permisos. Consultar la documentación de la versión instalada antes de escribir código de Next.js; no asumir que coincide con versiones conocidas.
2. Leer `app/globals.css`, `app/layout.tsx` y los componentes de la ruta afectada para conocer el punto de partida. Conservar cambios del usuario.
3. Usar [app/ui-tokens.css](../../../app/ui-tokens.css) como contrato exacto de valores. Leer [references/components.md](references/components.md) para componer UI y resolver sus estados.
4. Para revisar resultados, consultar los casos relevantes de [references/scenarios.md](references/scenarios.md).

Las instrucciones explícitas del usuario prevalecen. Si solicita cambiar una decisión visual compartida, actualizar el contrato y sus consumidores afectados dentro del alcance autorizado, describiendo la excepción. Si falta una decisión que no puede resolverse con estas recetas, señalarla y proponer una extensión concreta; no inventar una variante distinta para cada pantalla.

## Uso de tokens

Los tokens canónicos están en `app/ui-tokens.css`, importados directamente por `app/layout.tsx` junto con `app/door-list.css` y `app/globals.css`. Conservar `@import "tailwindcss"` en el CSS global y los estilos existentes. No instalar dependencias para hacerlo. Si se crea un archivo de tokens de ejecución, enlazarlo aquí como fuente canónica y retirar el asset duplicado en el mismo cambio. Mantener una sola definición mantenida de los valores.

Consumir variables semánticas. No introducir colores hexadecimales, familias tipográficas, sombras, radios ni valores de espaciado locales fuera del contrato. Se permiten `0`, `auto`, porcentajes, fracciones de grid y medidas derivadas de los tokens para distribución; los tamaños específicos de contenido como un QR requieren una decisión explícita documentada.

Reutilizar las fuentes ya configuradas en `app/layout.tsx`; no volver a descargarlas ni añadir otra familia. Reutilizar los iconos existentes; no añadir una biblioteca ni usar emojis como sustituto de iconos del sistema.

## Flujo de implementación

- Elegir una receta y roles de tokens antes de escribir estilos. Buscar un componente existente equivalente y extenderlo antes de duplicarlo.
- Mantener Server Components por defecto. Justificar en la descripción del cambio cada nueva frontera `"use client"` con su necesidad real: estado interactivo, eventos o API del navegador.
- Mantener un componente junto a su ruta mientras solo tenga un consumidor de ruta. Extraerlo a `components/` cuando lo usen al menos dos rutas. No crear una biblioteca anticipadamente.
- Separar datos de presentación: pasar contratos de `lib/` ya convertidos a camelCase; reutilizar los helpers de formato. No consultar Supabase desde una tarjeta visual.
- Resolver contenido, vacío, carga y error cuando el flujo pueda alcanzarlos. No añadir acciones sin una ruta, permiso o callback real.
- Verificar los casos afectados de `references/scenarios.md`. No instalar herramientas ni ejecutar comandos de base de datos sin la confirmación exigida por `AGENTS.md`.

## Cierre verificable

Informar qué receta se usó, qué componentes se reutilizaron, qué estados se cubrieron y qué validaciones se ejecutaron. Declarar excepciones y comprobaciones visuales pendientes. No presentar una revisión del código como prueba de que se comprobó el resultado en un navegador.
