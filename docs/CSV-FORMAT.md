# Exportación CSV

El formato provisional usa codificación UTF-8 con BOM y punto y coma como separador, para facilitar la apertura en Excel en configuraciones regionales donde la coma se utiliza como separador decimal.

Columnas actuales: Fecha, Tipo de comida, Comida, Hora, Bebida y Notas. Todos los campos se entrecomillan y las comillas internas se duplican. Las cadenas que comiencen con caracteres interpretables como fórmula se neutralizan para reducir el riesgo de ejecución en hojas de cálculo.

Este contrato es temporal. Una plantilla proporcionada por el cliente tendrá prioridad sobre estos encabezados.

## Ejemplo de encabezado generado

El exportador entrecomilla cada celda, incluidos los encabezados. La primera fila actual es:

`"Fecha";"Tipo de comida";"Comida";"Hora";"Bebida";"Notas"`

Por eso las pruebas deben comprobar este formato con las comillas incluidas; el BOM UTF-8 aparece antes de la primera comilla.
