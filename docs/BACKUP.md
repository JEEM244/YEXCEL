# Respaldo y restauración

YEXCEL utiliza un archivo JSON de respaldo versionado que incluye:
- Identificador de formato (`yexcel-backup`).
- Versión de esquema.
- Fecha de creación.
- Lista de registros.

La restauración debe validar el archivo entero antes de reemplazar o combinar datos. Un archivo inválido no debe modificar registros existentes. Guarda el respaldo en una ubicación privada y evita compartirlo si contiene datos personales.

## Comportamiento actual de restauración

La interfaz solicita confirmación y reemplaza el conjunto actual por el respaldo elegido; no mezcla registros ni hace deduplicación por comida/fecha. El archivo se valida antes de guardar. Se limita el tamaño de archivo en la interfaz y el número de registros admitidos. Exporta un respaldo nuevo antes de probar una restauración en un perfil que contenga datos importantes.
