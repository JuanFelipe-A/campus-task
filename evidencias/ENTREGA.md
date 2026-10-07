# Taller CampusTasks — entorno, actualización y eliminación de tareas

## 1. Datos

| | |
|---|---|
| **Asignatura** | Desarrollo de Software II — Universidad del Valle |
| **Fecha** | 6 de octubre de 2026 |
| **Integrante 1** | Juan Felipe Aristizabal — 2459364-3743 |
| **Integrante 2** | Juan José Bolaños — 2380616 |
| **Repositorio (fork)** | https://github.com/JuanFelipe-A/campus-task |
| **Rama de entrega** | `jfa` |

**Reparto del trabajo**

- Juan Felipe Aristizabal: puesta en marcha del entorno y backend (actualizar y eliminar tareas, con sus pruebas).
- Juan José Bolaños: frontend (actualizar y eliminar tareas desde la interfaz, con sus pruebas).
- Prueba manual de extremo a extremo: realizada en conjunto.

---

## 2. Puesta en marcha

### 2.1 Fork y rama de trabajo

Se hizo fork del repositorio del profesor, se clonó y se creó la rama `jfa` (no se trabajó sobre `master`).

![Fork en GitHub](evidencias/01-fork-github.png)

![Rama jfa creada](evidencias/02-git-rama.png)

### 2.2 Variables de entorno

Se creó `backend/.env` con la conexión a PostgreSQL local. El archivo está ignorado por Git y **no** se sube al repositorio (se verificó con `git status`).

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=neo
DB_PASSWORD=
DB_NAME=campus_tasks
```

![.env ignorado por Git](evidencias/03-env-git-status.png)

### 2.3 Herramientas

- Node.js v24 (el equipo tenía v26; se instaló `nvm` y se fijó Node 24 como versión por defecto).
- PostgreSQL 17 instalado con Homebrew y levantado como servicio.

![Versiones de Node, npm y PostgreSQL](evidencias/04-postgres-nmp-node.png)

### 2.4 Base de datos

Se creó la base `campus_tasks` y la tabla `tareas` con los datos de ejemplo del taller (2 filas).

![Tabla tareas](evidencias/05-tabla-tareas.png)

### 2.5 Backend arrancado

`npm run start:dev` en `backend`. Nest registra las rutas y la API responde en `http://localhost:3000/tareas`.

![Backend arrancado y respuesta en localhost](evidencias/06-backend-arrancado-localhost.png)

### 2.6 Frontend antes de los cambios

![Frontend antes](evidencias/07-frontend-antes.png)

### 2.7 Pruebas iniciales (línea base)

Estado de partida de las pruebas, antes de implementar nada.

![npm test backend (inicial)](evidencias/09-npm-test-backend.png)

![npm test frontend (inicial)](evidencias/10-npm-test-frontend.png)

---

## 3. Lectura de los ejemplos

### 3.1 Backend

Flujo de una petición: `TareasController` → `TareasService` → `DatabaseService.query` (pool de `pg`) → PostgreSQL.

- **Servicio (`tareas.service.ts`)**: cada método ejecuta una consulta SQL **parametrizada** (`$1`, `$2`), nunca concatenada, y devuelve las filas.
- **Controlador (`tareas.controller.ts`)**: recibe la petición HTTP, delega en el servicio y devuelve el resultado. Es la capa que decide los códigos HTTP.
- **Pruebas unitarias (`tareas.service.spec.ts`)**: se reemplaza `query` por un `jest.fn()` que devuelve `{ rows }`; se llama al método del servicio y se verifica el resultado y que `query` se llamó con el SQL y los parámetros exactos.
- **Pruebas de integración (`tareas.integration.spec.ts`)**: se levanta la app de Nest con el `DatabaseService` simulado y se usa `supertest` para enviar peticiones HTTP reales contra el controlador; se verifican estado, cuerpo y la llamada a `query`.

Patrón común de todas las pruebas: **preparar → ejecutar → verificar**.

> `backend/test/app.e2e-spec.ts` no se tomó como modelo: es la plantilla de Nest y no sigue el patrón del proyecto.

### 3.2 Frontend

> **[PENDIENTE — Juan José Bolaños]**
> Resumen breve de cómo funcionan `tareas.service.ts` (HttpClient + Observables), `tareas.component.ts` (signal `tareas`, actualización dentro de `subscribe`) y `tareas.component.spec.ts` (spy con `jasmine.createSpyObj`).

---

## 4. Implementación

### 4.1 Backend

**Servicio** (`backend/src/tareas/tareas.service.ts`)

```ts
async actualizar(id: number, titulo: string): Promise<Tarea> {
  const resultado = await this.db.query<Tarea>(
    'UPDATE tareas SET titulo = $1 WHERE id = $2 RETURNING id, titulo',
    [titulo, id],
  );
  return resultado.rows[0];
}

async eliminar(id: number): Promise<Tarea> {
  const resultado = await this.db.query<Tarea>(
    'DELETE FROM tareas WHERE id = $1 RETURNING id, titulo',
    [id],
  );
  return resultado.rows[0];
}
```

**Controlador** (`backend/src/tareas/tareas.controller.ts`)

```ts
@Patch(':id')
async actualizar(
  @Param('id', ParseIntPipe) id: number,
  @Body('titulo') titulo: string,
): Promise<Tarea> {
  const tarea = await this.tareasService.actualizar(id, titulo);
  if (!tarea) {
    throw new NotFoundException(`No existe la tarea con id ${id}`);
  }
  return tarea;
}

@Delete(':id')
async eliminar(@Param('id', ParseIntPipe) id: number): Promise<Tarea> {
  const tarea = await this.tareasService.eliminar(id);
  if (!tarea) {
    throw new NotFoundException(`No existe la tarea con id ${id}`);
  }
  return tarea;
}
```

**Rutas expuestas**

| Método | Ruta | Descripción | Éxito | Error |
|---|---|---|---|---|
| PATCH | `/tareas/:id` | Actualiza el título | 200 + tarea | 404 si no existe, 400 si el id no es numérico |
| DELETE | `/tareas/:id` | Elimina la tarea | 200 + tarea eliminada | 404 si no existe, 400 si el id no es numérico |

![Rutas registradas por Nest](evidencias/12-backend-rutas.png)

**Decisiones de diseño**

1. **El `:id` se convierte a número con `ParseIntPipe`.** Los parámetros de ruta llegan como texto; el pipe los convierte a `number` antes de llegar al servicio, que así recibe el tipo que declara. Además, un id no numérico (`/tareas/abc`) se rechaza con **400 Bad Request** antes de tocar la base de datos.
2. **Detección del 404 en el controlador, no en el servicio.** Gracias a `RETURNING`, si ninguna fila fue afectada `rows[0]` es `undefined`. El servicio simplemente devuelve ese valor y es el controlador quien decide responder `NotFoundException` (404). Así el servicio no conoce HTTP y se mantiene reutilizable y fácil de probar de forma aislada.
3. **SQL siempre parametrizado** (`$1`, `$2`) para evitar inyección SQL.

### 4.2 Frontend

> **[PENDIENTE — Juan José Bolaños]**
> Qué se agregó en `tareas.service.ts` (métodos `actualizar` y `eliminar`), en `tareas.component.ts` / `.html` (botones, edición del título), cómo se actualiza la lista **solo dentro del `subscribe` exitoso**, y cómo se comporta ante un error / 404.
> Incluir capturas `fe-*.png`.

---

## 5. Pruebas

### 5.1 Pruebas nuevas — backend

**Unitarias (servicio)** — 2 pruebas nuevas

| Prueba | SQL verificado | Parámetros |
|---|---|---|
| Actualiza el título por id y devuelve la fila actualizada | `UPDATE tareas SET titulo = $1 WHERE id = $2 RETURNING id, titulo` | `['Título nuevo', 1]` |
| Elimina la tarea por id y devuelve la fila eliminada | `DELETE FROM tareas WHERE id = $1 RETURNING id, titulo` | `[2]` |

**Integración (HTTP con supertest)** — 4 pruebas nuevas

| Prueba | Petición | Resultado esperado |
|---|---|---|
| PATCH existente | `PATCH /tareas/1` `{ titulo: 'Título actualizado' }` | 200, tarea actualizada; `query` con `['Título actualizado', 1]` |
| PATCH inexistente | `PATCH /tareas/999` | 404; `query` con `['No importa', 999]` |
| DELETE existente | `DELETE /tareas/2` | 200, tarea eliminada; `query` con `[2]` |
| DELETE inexistente | `DELETE /tareas/999` | 404; `query` con `[999]` |

En todas se comprueba que el id llega a `query` como **número**.

**Resultado:** 2 suites, **10 pruebas pasando** (4 originales + 6 nuevas).

![npm test backend final](evidencias/11-npm-test-backend-final.png)

### 5.2 Verificación manual de la API con curl

Con el backend y PostgreSQL reales.

PATCH:

![curl PATCH](evidencias/13-curl-patch.png)

DELETE:

![curl DELETE](evidencias/14-curl-delete.png)

Casos de error (id inexistente → 404, id no numérico → 400):

![curl errores](evidencias/15-curl-errores.png)

### 5.3 Pruebas nuevas — frontend

> **[PENDIENTE — Juan José Bolaños]**
> Pruebas agregadas en `tareas.component.spec.ts`, qué verifica cada una y captura de `npm test` con **4 de 4** exitosas.

### 5.4 Prueba manual de extremo a extremo

> **[PENDIENTE — en conjunto]**
> Con backend + PostgreSQL + frontend en `http://localhost:4200`: editar una tarea, eliminar una tarea, y comprobar que la lista y la base de datos coinciden. Incluir capturas.

---

## 6. Git

- Fork: https://github.com/JuanFelipe-A/campus-task
- Rama de entrega: `jfa` (publicada en el fork; `master` no se modificó).
- `.env` no se versiona.
- Se agregaron archivos con rutas explícitas desde la raíz del repositorio y se hizo `git pull --rebase` antes de cada `push`.

**Commits del backend**

1. Servicio `actualizar` + prueba unitaria
2. Ruta `PATCH /tareas/:id` + pruebas de integración
3. Servicio `eliminar` + prueba unitaria
4. Ruta `DELETE /tareas/:id` + pruebas de integración

> **[PENDIENTE]** Añadir los commits del frontend (Juan José) y el del `evidencias/` + `ENTREGA.md`. Se puede listar con `git log --oneline`.

```bash
git switch jfa
git add evidencias/ ENTREGA.md
git status          # confirmar que NO aparecen .env ni .DS_Store
git commit -m "docs: agrega ENTREGA.md y evidencias"
git pull --rebase
git push
```
