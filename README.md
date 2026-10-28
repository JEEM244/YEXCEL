# YEXCEL

Aplicación web local para capturar los formatos físicos de **Registro de Alimentos** y convertirlos en un concentrado organizado para Excel.

## Ejecutar

Abre `index.html` en un navegador moderno. No se necesita servidor ni instalación para el uso local básico. Los datos se guardan en el almacenamiento local del navegador de ese dispositivo.

Para ejecutar las pruebas existentes de utilidades y almacenamiento con Node.js 20 o superior:

```sh
npm test
npm run check
```

## Flujo de trabajo

1. Captura la fecha, centro o casa club, encargado de cocina, desayunos y comidas otorgadas, menú, agua y fruta.
2. Agrega los insumos en las categorías del formato físico: **Desayuno**, **Fruta y verdura**, **Abarrotes y desechables** y **Carnes y carnes frías**.
3. Guarda un registro por fecha. Si ya existe uno para esa fecha, la aplicación pide confirmación antes de reemplazarlo.
4. Consulta, busca, edita o elimina registros desde el historial.
5. Elige el mes que quieres concentrar y descarga el archivo compatible con Excel.

## Exportación

El archivo `.xls` generado utiliza el formato XML de hoja de cálculo de Microsoft Excel e incluye dos hojas:

- **Registros diarios**: todos los registros, con datos generales y cada insumo en su propia fila.
- **Concentrado**: insumos agrupados por categoría, descripción y unidad; fechas del mes seleccionado en columnas y total por insumo.

El concentrado suma cantidades de la misma descripción, categoría y unidad cuando aparecen en diferentes días. La exportación diaria conserva todos los meses, mientras que el concentrado sigue el mes seleccionado en el filtro del historial.

También se puede descargar y restaurar un respaldo JSON. Los archivos de exportación deben abrirse y compararse con la plantilla física en Excel antes de usarse como entrega oficial.

## Estructura

```text
YEXCEL/
├── index.html
├── css/food-log.css
├── js/food-log.js
├── js/                 # módulos del prototipo anterior y sus pruebas
├── tests/
├── docs/
└── package.json
```

## Privacidad y límites

No hay cuentas, servidor, sincronización ni respaldo automático. Los datos no salen del navegador salvo cuando se descargan y comparten archivos manualmente. Borrar los datos del sitio puede perder los registros; descarga respaldos periódicos.

La exportación actual es un libro XML compatible con Excel con extensión `.xls`, no un archivo binario `.xlsx`. No se ha validado todavía en una instalación real de Microsoft Excel ni se ha comparado impreso con el formato del DIF. Consulta `docs/MANUAL-QA.md` antes de entregar.
