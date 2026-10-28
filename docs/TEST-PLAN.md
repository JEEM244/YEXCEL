# Plan de pruebas

## Pruebas automatizables
- Fechas locales correctas sin desfase de zona horaria.
- Rechazo de fechas imposibles y registros incompletos.
- Escape de HTML para texto ingresado por usuario.
- Formato CSV con comillas y saltos de línea.
- Prevención de fórmulas en celdas CSV que comiencen con `=`, `+`, `-` o `@`.
- Carga de datos dañados desde almacenamiento.
- Importación de respaldo JSON inválido.
- Recuento de días únicos y registros mensuales.

## Pruebas manuales
- Restaurar un respaldo JSON versionado y cancelar la operación de confirmación.
- Comprobar que un rango de fechas invertido se marca como inválido.
- Editar un registro existente y comprobar que conserva su identificador.
- Agregar, editar y eliminar comidas.
- Navegar meses y seleccionar fechas.
- Buscar por nombre, nota y fecha.
- Exportar y abrir el CSV en Excel.
- Usar solo teclado, reducir movimiento y comprobar pantalla estrecha.
- Recargar, bloquear almacenamiento y verificar mensajes.

No marcar una prueba como aprobada hasta ejecutarla en un navegador o en el runner de pruebas correspondiente.

## Runner automatizado y fixtures
Ejecuta `npm run check` y `npm test` con Node.js 20+. Los archivos JSON de `tests/fixtures/` cubren un respaldo válido y uno inválido. El workflow de GitHub Actions corre estos pasos en las ramas configuradas; revisar su resultado antes de dar la entrega por finalizada.
