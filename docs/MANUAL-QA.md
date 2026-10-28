# Pruebas manuales de YEXCEL

Completar con un navegador real antes de entregar el archivo generado:

## Captura del registro físico

- [ ] Abrir `index.html` en escritorio y en pantalla estrecha.
- [ ] Guardar un registro con fecha, centro, encargado, desayunos, comidas, menú, agua y fruta.
- [ ] Comprobar que el catálogo muestra los insumos y unidades del formato físico, y que solo se necesita escribir la cantidad.
- [ ] Comprobar que la descripción y la unidad de cada insumo no se pueden alterar accidentalmente desde la captura.
- [ ] Comprobar que no se guarda un insumo incompleto si tiene algún dato capturado.
- [ ] Guardar dos fechas diferentes y comprobar que se muestran en el historial.
- [ ] Intentar guardar una segunda hoja para la misma fecha y comprobar que solicita confirmación.
- [ ] Editar un registro existente y confirmar que no crea otro duplicado.
- [ ] Eliminar un registro y comprobar que pide confirmación.
- [ ] Buscar por centro, menú, encargado y nombre de insumo.
- [ ] Filtrar por mes y comprobar que solo cambia el historial y el mes de concentrado.

## Exportación a Excel

- [ ] Descargar el libro .xlsx con datos de varios días y meses y comprobar que abre sin advertencia de formato.
- [ ] Abrir el archivo `.xlsx` en Microsoft Excel o LibreOffice y confirmar que reconoce dos hojas: Concentrado y Registros diarios.
- [ ] Comprobar que Registros diarios contiene todos los meses, datos generales y una fila por insumo capturado.
- [ ] Comprobar que Concentrado contiene únicamente el mes elegido, una columna por fecha, descripción con unidad y fórmulas de TOTAL.
- [ ] Verificar sumas con cantidades enteras y decimales, por ejemplo 0.25, 0.5 y 2.5.
- [ ] Verificar que el mismo producto con diferente unidad o categoría no se agrupa incorrectamente.
- [ ] Comparar los nombres, unidades, orden de insumos y presentación con las hojas físicas del PDF y el Excel de referencia del cliente.
- [ ] Confirmar que acentos, comillas, ampersands y caracteres especiales se ven correctamente.
- [ ] Imprimir una muestra y comparar el resultado con el formato físico.

## Respaldo y persistencia

- [ ] Descargar respaldo JSON, restaurarlo y verificar que conserva los registros.
- [ ] Intentar restaurar un archivo JSON inválido y confirmar que los datos actuales no cambian.
- [ ] Recargar la página y comprobar que los datos siguen presentes.
- [ ] Bloquear almacenamiento del navegador y comprobar que se informa del error sin anunciar un guardado falso.

## Pendiente

La exportación genera un `.xlsx` real sin librerías externas. Debe probarse con Microsoft Excel y con la impresora que utilizará el personal antes de la entrega oficial.
