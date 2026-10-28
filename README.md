# YEXCEL

Prototipo web para registrar comidas por fecha, consultar un historial y exportar los datos a un archivo CSV compatible con Excel.

## Estructura

```text
YEXCEL/
├── index.html       # Estructura de la interfaz
├── css/
│   └── styles.css   # Estilos, diseño responsive y tema visual
├── js/
│   └── app.js       # Calendario, formularios, historial y exportación
└── README.md
```

## Cómo ejecutarlo

1. Descarga o clona el repositorio.
2. Abre `index.html` en un navegador moderno.
3. Registra comidas y navega entre las vistas desde el menú.

No necesita instalar dependencias ni usar un servidor para el funcionamiento básico.

## Datos y limitaciones actuales

- Los registros se guardan en `localStorage` del navegador y equipo donde se usa la app.
- Borrar los datos del navegador puede eliminar esos registros. Todavía no hay cuentas, sincronización ni respaldo automático.
- La exportación actual genera un archivo CSV que puede abrir Excel; todavía no genera un libro XLSX nativo.
- Los campos y encabezados son provisionales y deberán ajustarse cuando se reciba la plantilla del cliente.

## Tecnologías

HTML, CSS y JavaScript sin framework.
