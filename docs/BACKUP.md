# Respaldo y restauración

YEXCEL utiliza un archivo JSON de respaldo versionado que incluye:
- Identificador de formato (`yexcel-backup`).
- Versión de esquema.
- Fecha de creación.
- Lista de registros.

La restauración debe validar el archivo entero antes de reemplazar o combinar datos. Un archivo inválido no debe modificar registros existentes. Guarda el respaldo en una ubicación privada y evita compartirlo si contiene datos personales.
