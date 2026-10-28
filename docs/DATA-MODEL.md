# Modelo de datos provisional

Cada registro de comida usa este esquema:

| Campo | Tipo | Requerido | Uso |
|---|---|---|---|
| `id` | string | Sí | Identificador único interno |
| `date` | `YYYY-MM-DD` | Sí | Día de la comida |
| `type` | string | Sí | Desayuno, Colación, Comida, Merienda, Cena u Otro |
| `food` | string | Sí | Descripción de la comida |
| `time` | `HH:mm` o vacío | No | Hora aproximada |
| `drink` | string | No | Bebida |
| `notes` | string | No | Notas adicionales |

El modelo es provisional. No se deben añadir campos clínicos, calorías o valoraciones personales sin necesidad confirmada por el cliente.

## Límites actuales de validación

- Máximo de 10,000 registros en un respaldo o guardado.
- Comida: hasta 120 caracteres.
- Bebida: hasta 80 caracteres.
- Notas: hasta 400 caracteres.
- Hora opcional en formato HH:mm de 24 horas.
- Los identificadores son internos y deben ser únicos.

Estos límites son técnicos y provisionales; confirmar con el cliente si necesita otros.
