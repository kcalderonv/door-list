const messages = ["No autorizado", "El aforo debe ser positivo", "Evento no encontrado", "Tipo de entrada no encontrado", "El aforo no puede ser menor que la cantidad de personas registradas", "El aforo es menor que el total asignado a las entradas", "El aforo de la entrada no puede ser menor que la cantidad de personas registradas", "La suma de aforos supera el aforo del evento"];
export function providerMessage(error: {message?:string} | null | undefined): string {
 const known = messages.find(message => message === error?.message);
 return known ?? "No se pudo completar la operaci?n. Int?ntalo nuevamente.";
}
