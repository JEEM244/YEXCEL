# Solución de problemas

## Los registros no aparecen en otro equipo
La versión local guarda datos en el perfil de navegador de una computadora. No sincroniza entre equipos.

## El navegador no guarda
Puede estar bloqueando el almacenamiento o no haber espacio. Exporta un respaldo si todavía puedes leer los datos, y evita borrar los datos del sitio antes de revisarlos.

## Excel muestra caracteres extraños
Abre el CSV con la codificación UTF-8 o impórtalo desde Excel seleccionando UTF-8. La versión actual genera el archivo con BOM.

## El calendario muestra un día diferente
Usa fechas ISO YYYY-MM-DD como valores internos y evita convertirlas con toISOString() para mostrarlas en el calendario local.
