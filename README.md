# YEXCEL

Prototipo web YEXCEL 0.3.0 para registrar comidas por fecha, consultar un historial, editar datos y exportar CSV o respaldo JSON.

## Estructura del proyecto

```text
YEXCEL/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── utils.js
│   ├── storage.js
│   └── export.js
├── tests/
├── docs/
└── package.json
```

## Ejecutar

Abre `index.html` en un navegador moderno. No se necesita servidor para el uso local básico. Para ejecutar pruebas de las funciones de datos necesitas Node.js 20 o superior:

```sh
npm test
npm run check
```

## Funciones del prototipo

- Registro, edición y eliminación de comidas por fecha.
- Calendario, historial, búsqueda y filtros por rango de fechas.
- Almacenamiento local con intento de migración desde la versión anterior.
- Exportación CSV compatible con Excel y neutralización básica de fórmulas en celdas.
- Descarga y restauración de respaldo JSON versionado, con validación y confirmación.

## Pruebas y documentación

Ejecuta `npm test` y `npm run check` con Node.js 20 o superior. Consulta `docs/MANUAL-QA.md` para las verificaciones que todavía necesitan un navegador real. La integración continua se configura en `.github/workflows/tests.yml`.

La carpeta `docs/` reúne arquitectura, privacidad, modelo de datos, preguntas al cliente, formato CSV, respaldo, despliegue, solución de problemas y hoja de ruta.

## Importante

Los datos se guardan en el almacenamiento local del navegador actual. No hay cuentas, sincronización ni respaldo automático. Borrar datos del sitio puede hacer que se pierdan registros. Los encabezados de exportación todavía son provisionales: deben ajustarse a la plantilla exacta que entregue el cliente.

Consulta `CHANGELOG.md` para este hito y `docs/MANUAL-QA.md` para las pruebas manuales pendientes.
