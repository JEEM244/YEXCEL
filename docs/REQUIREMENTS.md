# Requisitos de YEXCEL

## Basado en los archivos de referencia proporcionados

La hoja física de Registro de Alimentos y el Excel de ejemplo son la base del flujo. La interfaz debe conservar los conceptos y categorías que aparecen en esos materiales, sin inventar datos que no se muestran.

### Datos generales por fecha

- Fecha.
- Centro o casa club.
- Encargado de cocina.
- Desayunos otorgados.
- Comidas otorgadas.
- Menú.
- Agua.
- Fruta.

### Categorías de insumos

- Desayuno.
- Fruta y verdura.
- Abarrotes y desechables.
- Carnes y carnes frías.

Cada línea de insumo contiene descripción, cantidad y unidad. Puede haber varias líneas en cada categoría.

## Funciones implementadas en el prototipo

- Capturar un registro por fecha.
- Añadir o quitar líneas de insumos.
- Guardar en el navegador, consultar, buscar, editar y eliminar registros.
- Filtrar el historial por mes.
- Descargar un libro compatible con Excel con hoja de registros diarios y hoja de concentrado mensual.
- Descargar y restaurar respaldo JSON.

## Límites conocidos

- Los datos se almacenan localmente en el navegador actual; no hay cuentas, sincronización ni respaldo automático.
- La exportación es SpreadsheetML XML con extensión `.xls`, no un archivo binario `.xlsx`.
- La apariencia y las sumas del libro generado deben verificarse en Excel frente a la plantilla original antes de usarlo como entrega oficial.
