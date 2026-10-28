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
