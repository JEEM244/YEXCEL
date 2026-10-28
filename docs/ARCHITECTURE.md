# Arquitectura de YEXCEL

YEXCEL es una aplicación web estática. La primera etapa no requiere servidor, base de datos ni compilación.

## Capas

- `index.html`: estructura semántica y puntos de entrada.
- `css/styles.css`: tema visual y distribución responsive.
- `js/app.js`: conecta pantallas, eventos y estado.
- `js/utils.js`: fechas, texto y transformaciones puras.
- `js/storage.js`: validación y persistencia local.
- `js/export.js`: exportación CSV y respaldo JSON.
- `tests/`: pruebas automáticas con el runner nativo de Node.

## Principio de diseño

La lógica que transforma datos debe mantenerse independiente del DOM siempre que sea posible. La interfaz nunca debe asumir que el almacenamiento local está disponible: debe informar al usuario si no puede guardar.

## Flujo de datos

Formulario → validación → almacenamiento local → renderizado de calendario/historial → exportación.
