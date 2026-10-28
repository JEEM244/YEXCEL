# YEXCEL

Aplicación web local para capturar los formatos físicos de **Registro de Alimentos** y generar un libro de Excel organizado para el cliente.

## Ejecutar

Abre `index.html` en un navegador moderno. No se necesita servidor ni instalación para el uso local básico. Los datos se guardan en el almacenamiento local del navegador de ese dispositivo.

Para ejecutar las pruebas de utilidades, almacenamiento y exportación con Node.js 20 o superior:

```sh
npm test
npm run check
```

## Flujo de trabajo

1. La fecha se inicializa con el día actual y el centro se propone como **Casa club: Caminando Juntos**; ambos se pueden revisar.
2. Completa los datos generales de la hoja física: encargado de cocina, desayunos y comidas otorgadas, menú, agua y fruta.
3. En los insumos, las descripciones y unidades se cargan desde el catálogo. El usuario solo necesita capturar las cantidades requeridas; no tiene que volver a escribir nombres ni unidades.
4. Guarda un registro por fecha. Si ya existe uno para esa fecha, la aplicación pide confirmación antes de reemplazarlo.
5. Consulta, busca, edita o elimina registros desde el historial.
6. Elige el mes que quieres concentrar y descarga el libro `.xlsx`.

## Exportación

El archivo es un libro **XLSX real**, no un XML renombrado. Incluye dos hojas:

- **Concentrado**: lista de insumos con su unidad en la descripción, una columna por cada fecha registrada en el mes seleccionado y una columna **TOTAL** calculada con fórmula. Conserva el orden del catálogo y agrega insumos históricos que no estén en él.
- **Registros diarios**: historial completo de todos los meses con fecha, centro, encargado, desayunos, comidas, menú, agua, fruta, categoría, descripción, cantidad y unidad.

El concentrado se filtra por el mes seleccionado en el historial; la hoja de registros diarios conserva todos los meses. La descripción, las unidades y los encabezados son automáticos. Las cantidades vacías quedan en blanco y los totales se calculan en Excel.

También se puede descargar y restaurar un respaldo JSON. Como parte de la entrega, abre el archivo generado con Microsoft Excel o LibreOffice y revisa que el diseño impreso corresponda al formato físico del cliente.

## Catálogo

El catálogo incluye desayuno, fruta y verdura, abarrotes y desechables, carnes y carnes frías, y condimentos y granos. Entre los insumos se encuentran yogurth, papaya, granola, pimiento morrón, cebolla, tomate, apio, limón, cilantro, aceite, arroz, cubiertos, servilletas, achiote, tortillas, consomé, papel aluminio, filete de pescado, pierna y muslo, pechuga de pollo, carne molida, mantequilla, margarina, frijol, lentejas, ajo, sal y jamaica.

## Estructura

```text
YEXCEL/
├── index.html
├── css/food-log.css
├── js/food-log.js
├── js/xlsx-export.js
├── js/                 # módulos del prototipo anterior y sus pruebas
├── tests/
├── docs/
└── package.json
```

## Privacidad y límites

No hay cuentas, servidor, sincronización ni respaldo automático. Los datos no salen del navegador salvo cuando se descargan y comparten archivos manualmente. Borrar los datos del sitio puede perder los registros; descarga respaldos periódicos.

La exportación se genera sin dependencias externas. Aun así, antes de entregar al cliente, deben completarse las pruebas manuales de apertura, sumas y formato de impresión descritas en `docs/MANUAL-QA.md`.
