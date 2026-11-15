# Casos para validar el skill

Estos casos son entradas y criterios de aceptación, no pruebas ya ejecutadas. Usarlos en una tarea real o en una copia aislada sin acceso a base de datos. No instalar dependencias para simularlos.

## Selección del skill

| Solicitud | Resultado esperado |
| --- | --- |
| «Crea tarjetas de eventos en la portada» | Activar; receta EventCard y grid |
| «Unifica el formulario de registro con el organizador» | Activar; tokens y Field; extraer solo piezas realmente compartidas |
| «Añade el estado vacío y el de carga del listado» | Activar; distinguir consulta pendiente y resultado vacío |
| «Revisa si esta pantalla mantiene el estilo del proyecto» | Activar en revisión; informar desviaciones sin editar si solo se pidió revisar |
| «Corrige el cálculo de capacidad en la API» | No activar si no cambia UI |
| «Crea una migración de ticket_types» | No activar por esta tarea |
| «Cambia el HTML del correo» | No activar; este contrato cubre la interfaz web |

Invocación explícita de ejemplo: «Usa $door-list-ui para añadir el estado vacío del listado de eventos». El nombre y la description facilitan la selección automática; no equivalen a un hook de cumplimiento obligatorio.

## Casos de reproducción

### A. Lista con contenido

Entrada: tres eventos de prueba con nombres breves, fechas y lugares válidos; destinos de registro existentes. Repetir con un título de 180 caracteres y un lugar de 200 caracteres sin espacios. Usar datos locales de prueba, sin crear registros en Supabase.

Esperado: las tres tarjetas usan los mismos tokens, orden y roles tipográficos; una columna a 390px y dos a 1280px. Los textos largos envuelven sin desbordar ni ocultar datos. Enlaces y botones conservan nombres y foco visibles.

### B. Vacío según contexto

Entrada 1: consulta pública completada con cero eventos.
Esperado: texto «Pronto habrá nuevos encuentros» y ninguna acción «Crear evento».

Entrada 2: organizador autorizado, consulta completada con cero eventos y creación disponible.
Esperado: «Aún no tienes eventos» y una acción «Crear evento» conectada al flujo real. Ambos vacíos comparten receta visual.

### C. Carga, error y recuperación

Entrada: carga inicial pendiente; después fallo controlado; después reintento exitoso con cero resultados.
Esperado: tres skeletons estáticos y un anuncio «Cargando eventos…» → error controlado con reintento funcional → vacío confirmado. Nunca mostrar datos de prueba como contenido ni un vacío durante carga.

Entrada adicional: actualización pendiente con eventos previos y posterior fallo.
Esperado: conservar las tarjetas; indicar carga de la región y después fallo sin borrar datos útiles.

### D. Formulario

Entrada: formulario sin completar; error de un campo; envío pendiente; error controlado del proveedor.
Esperado: label asociado, error conectado con aria-describedby y aria-invalid, foco visible, botón pendiente sin doble envío y mensaje en español sin detalles internos. Justificar el componente cliente por sus eventos y estado; los contenedores que no requieren cliente permanecen en servidor.

### E. Estructura

Entrada: tarjeta consumida solo por `/organizador`.
Esperado: junto a esa ruta. Al utilizarla también en otra ruta, extraer a `components/`. Reutilizar contratos y helpers de `lib/` sin duplicar tipos de dominio ni conectar el componente visual a Supabase.

## Evidencia mínima de aceptación

Para cambios implementados, inspeccionar la UI a 390px y 1280px, con zoom de 200%, navegación por teclado, contenido largo y los estados alcanzables. Comprobar contraste de las combinaciones realmente usadas: al menos 4.5:1 en texto normal, 3:1 en texto grande y elementos gráficos funcionales. Corregir problemas mediante el contrato compartido; no introducir parches de color por pantalla.

Revisar el diff para confirmar uso de tokens y ausencia de familias o escalas alternativas. Ejecutar lint y las comprobaciones pertinentes ya disponibles cuando se cambie código. Si no hay navegador o herramientas de contraste disponibles, informar esa limitación y dejar esas verificaciones pendientes; no afirmar que pasaron.

Si dos ejecuciones generan detalles estructurales distintos pero cumplen los mismos tokens, recetas, orden, semántica y estados, el resultado es válido. El contrato busca decisiones visuales reproducibles; no promete JSX idéntico ni imágenes idénticas entre entornos de fuentes o navegadores.
