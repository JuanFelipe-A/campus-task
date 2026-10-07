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
- Prueba manual de extremo a extremo: realizada en conjunto, sobre el equipo de Juan Felipe (backend, base de datos y frontend).

---

## 2. Puesta en marcha

### 2.1 Fork y rama de trabajo

Se hizo fork del repositorio del profesor, se clonó y se creó la rama `jfa`. No se trabajó sobre `master`.

![Fork en GitHub](evidencias/01-fork-github.png)

![Rama jfa creada](evidencias/02-git-rama.png)

### 2.2 Variables de entorno

Se creó `backend/.env` (dentro de `backend`, porque `dotenv` lo busca en la carpeta desde donde se arranca el servidor) con la conexión a PostgreSQL local. Estas son las cinco variables que lee `DatabaseService` (solo los nombres; los valores son los de la instalación local):

```
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

El archivo está ignorado por Git y **no** se sube al repositorio (se verificó con `git status`).

![.env ignorado por Git](evidencias/03-env-git-status.png)

### 2.3 Herramientas

- **Node.js 24.x** (el equipo tenía v26; se instaló `nvm` y se fijó Node 24 como versión por defecto). Comprobación: `node -v` → `v24.21.0` y `npm -v` → `11.19.0`.
- **PostgreSQL 17** instalado con Homebrew y levantado como servicio (`brew install postgresql@17` y `brew services start postgresql@17`). Comprobación: `psql --version` → `17.11` y `brew services list` → `postgresql@17 started`.

![Versiones de Node, npm y PostgreSQL](evidencias/04-postgres-nmp-node.png)

### 2.4 Base de datos

Se entró con `psql` (aparece la consola `postgres=#`) y se ejecutó, una sola vez:

```sql
CREATE DATABASE campus_tasks;
\c campus_tasks
CREATE TABLE tareas (id SERIAL PRIMARY KEY, titulo TEXT NOT NULL);
INSERT INTO tareas (titulo) VALUES
  ('Leer la guía de la clase 2'),
  ('Preparar el entorno de desarrollo');
```

El `\c campus_tasks` cambia la conexión a la base nueva; así la tabla queda en `campus_tasks` y no en la base equivocada. Comprobación: `SELECT * FROM tareas;` muestra las dos filas.

![Tabla tareas](evidencias/05-tabla-tareas.png)

### 2.5 Backend arrancado

`npm run start:dev` en `backend`. Nest registra las rutas y la API responde en `http://localhost:3000/tareas`.

![Backend arrancado y respuesta en localhost](evidencias/06-backend-arrancado-localhost.png)

### 2.6 Frontend antes de los cambios

![Frontend antes](evidencias/07-frontend-antes.png)

![Frontend después de agregar una tarea](evidencias/08-frontend-despues.png)

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
- **Pruebas unitarias (`tareas.service.spec.ts`)**: se reemplaza `query` por un `jest.fn()` que devuelve `{ rows }`; se llama al método del servicio y se verifica el resultado y que `query` se llamó con el SQL y los parámetros exactos. Los ejemplos cubren `listar` (devuelve `resultado.rows` y llama a `query` con el `SELECT` exacto) y `crear` (devuelve la fila insertada y llama a `query` con el `INSERT` y el título como parámetro).
- **Pruebas de integración (`tareas.integration.spec.ts`)**: se levanta la app de Nest con el `DatabaseService` simulado y se usa `supertest` para enviar peticiones HTTP reales contra el controlador; se verifican estado, cuerpo y la llamada a `query`. Los ejemplos cubren `GET /tareas` (200 y el JSON de las filas simuladas) y `POST /tareas` (201, y que `query` recibió el `INSERT` y el título).

Patrón común de todas las pruebas: **preparar → ejecutar → verificar**.

> `backend/test/app.e2e-spec.ts` no se tomó como modelo: es la plantilla de Nest y no sigue el patrón del proyecto.

### 3.2 Frontend

- **Servicio (`tareas.service.ts`)**: usa `HttpClient` y cada método devuelve un `Observable`. La URL base del backend es `http://localhost:3000`. Hasta el ejemplo, ofrecía `listar` (GET) y `crear` (POST).
- **Componente (`tareas.component.ts`)**: la lista vive en un `signal` (`tareas`). Al crear, la lista solo se actualiza **dentro del `subscribe`**, es decir, cuando el servidor respondió con éxito. Ese es el patrón que se siguió para editar y eliminar.
- **Plantilla (`tareas.component.html`)**: bloque `@for` con el número (`.numero`) y el título (`.titulo`) de cada tarea.
- **Pruebas (`tareas.component.spec.ts`)**: el servicio se reemplaza por un spy de Jasmine (`jasmine.createSpyObj('TareasService', [...])`) cuyos métodos devuelven `of(...)`. Cada prueba prepara el spy, ejecuta una acción sobre el DOM (clic en un botón) y verifica que el spy se llamó con los argumentos esperados y que el DOM refleja el cambio.

### 3.3 Patrón que se reutilizó

Todas las pruebas nuevas siguen el mismo patrón de los ejemplos, **preparar → ejecutar → verificar**:

| Paso | Unitaria (backend) | Integración (backend) | Componente (frontend) |
|---|---|---|---|
| Preparar | `query` simulado con `jest.fn()` que devuelve `{ rows }` | `TestingModule` con controlador, servicio y `DatabaseService` simulado | Spy del servicio con lo que debe devolver y componente renderizado con la lista inicial |
| Ejecutar | Llamar al método del servicio | Petición con `supertest` (método, ruta y cuerpo) | Escribir en el campo y pulsar el botón |
| Verificar | Valor devuelto y argumentos exactos de `query` | Estado, cuerpo y argumentos de `query` | El spy se llamó con los argumentos esperados y la pantalla muestra el resultado |

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

**Servicio** (`frontend/src/components/tareas/tareas.service.ts`)

```ts
actualizar(id: number, titulo: string): Observable<Tarea> {
  return this.http.patch<Tarea>(`${this.apiUrl}/tareas/${id}`, { titulo });
}

eliminar(id: number): Observable<Tarea> {
  return this.http.delete<Tarea>(`${this.apiUrl}/tareas/${id}`);
}
```

![Código del servicio](evidencias/fe-01-servicio.png)

**Componente** (`tareas.component.ts` y `tareas.component.html`)

- Tres señales nuevas: `editandoId` (tarea en edición), `tituloEditado` (texto del campo) y `error` (mensaje para el usuario).
- Métodos `editar`, `cancelar`, `guardar` y `eliminar`.
- La plantilla muestra, por cada tarea, **Editar** y **Eliminar**; si la tarea está en edición (`editandoId() === tarea.id`) muestra en su lugar un campo de texto con **Guardar** y **Cancelar**.
- **La lista solo cambia dentro del `subscribe` exitoso**: `guardar` reemplaza la tarea por la que devolvió el servidor, y `eliminar` la quita de la lista. Si la petición falla, la lista no se toca.

![Código del componente (1/2)](evidencias/fe-02-componente01.png)

![Código del componente (2/2)](evidencias/fe-02-componente02.png)

**Comportamiento ante errores** (`manejarError`)

- **404** (la tarea ya no existe en el servidor): se muestra "La tarea ya no existe. Se recargó la lista." y se vuelve a pedir la lista, que desaparece de la pantalla lo que ya no existe.
- **Cualquier otro error**: se muestra "No se pudo completar la operación. Intenta de nuevo." y la lista no cambia.
- En ambos casos se sale del modo edición.

### 4.3 Problemas encontrados durante la integración

| Problema | Causa | Solución |
|---|---|---|
| Al guardar una edición en el navegador, la petición devolvía **404** | El frontend usaba `http.put` y el backend expone `PATCH /tareas/:id` | Se cambió a `http.patch` en `TareasService.actualizar` |
| `npm test` del frontend no compilaba (`TS2345`) | `eliminar` estaba tipado como `Observable<void>`, pero el backend devuelve la tarea eliminada y el test simula esa respuesta | Se tipó como `Observable<Tarea>`, según el contrato real del backend |
| El equipo tenía Node v26 y el proyecto pide v24 | Versión instalada por defecto | Se instaló Node 24 con `nvm` |

Los dos primeros solo aparecieron al probar el backend y el frontend **juntos**: cada parte pasaba sus pruebas por separado, lo que muestra el valor de la prueba manual de extremo a extremo.

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
| PATCH inexistente | `PATCH /tareas/999`, con `query` devolviendo `rows` vacío | 404; `query` con `['No importa', 999]` |
| DELETE existente | `DELETE /tareas/2` | 200, tarea eliminada; `query` con `[2]` |
| DELETE inexistente | `DELETE /tareas/999`, con `query` devolviendo `rows` vacío | 404; `query` con `[999]` |

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

El archivo `tareas.component.spec.ts` tiene ahora 4 pruebas (2 originales + 2 nuevas). El spy del servicio incluye `actualizar` y `eliminar`.

| Prueba | Qué verifica | Origen |
|---|---|---|
| Muestra el id y el título de cada tarea | El DOM pinta `.numero` y `.titulo`; se llamó a `listar` | original |
| Agrega la tarea creada al hacer clic en Agregar | `crear` se llama con el título y la lista muestra las dos tareas | original |
| Edita una tarea al pulsar Editar y Guardar | Aparece el campo `.editar-input`; `actualizar` se llama con `(1, 'Título nuevo')`; la lista muestra el título nuevo | nueva |
| Elimina una tarea al pulsar Eliminar | `eliminar` se llama con `1`; la lista queda sin tareas | nueva |

**Resultado:** **4 de 4** pruebas exitosas.

![npm test frontend final](evidencias/fe-03-npm-test.png)

### 5.4 Prueba manual de extremo a extremo

Con PostgreSQL, el backend (`http://localhost:3000`) y el frontend (`http://localhost:4200`) corriendo a la vez.

**Edición**

1. Lista inicial en el navegador: ![Lista inicial](evidencias/fe-05-lista-inicial.png)
2. Se pulsa **Editar** y se escribe el título nuevo: ![Editando](evidencias/fe-06-editando.png)
3. Tras **Guardar**, la lista muestra el título nuevo sin recargar la página: ![Después de editar](evidencias/fe-07-despues-de-editar.png)
4. La base de datos tiene el cambio: ![BD después de editar](evidencias/fe-08-bd-despues-de-editar.png)

**Eliminación**

5. Lista justo antes de eliminar: ![Antes de eliminar](evidencias/fe-09-antes-de-eliminar.png)
6. Tras **Eliminar**, la tarea desaparece de la lista sin recargar: ![Después de eliminar](evidencias/fe-10-despues-de-eliminar.png)
7. La fila ya no está en la base de datos: ![BD después de eliminar](evidencias/fe-11-bd-despues-de-eliminar.png)

**Caso de error: eliminar una tarea que ya no existe (404)**

Se crea una tarea desde el frontend, se borra directamente en el backend con `curl` y, **sin recargar la página**, se pulsa **Eliminar** sobre ella.

8. Tarea creada y visible en la lista: ![Tarea fantasma creada](evidencias/fe-12-tarea-fantasma-creada.png)
9. Se elimina por fuera con `curl` (respuesta 200): ![curl DELETE fantasma](evidencias/fe-13-curl-delete-fantasma.png)
10. Al pulsar **Eliminar**, el backend responde 404; el frontend muestra "La tarea ya no existe. Se recargó la lista." y la lista se actualiza: ![Mensaje 404](evidencias/fe-14-mensaje-404.png)

---

## 6. Git

- Fork: https://github.com/JuanFelipe-A/campus-task
- **URL de la rama de entrega:** https://github.com/JuanFelipe-A/campus-task/tree/jfa
- Rama de entrega: `jfa`, publicada en el fork. `master` no se modificó.
- `.env` no se versiona.
- Los archivos se agregaron con rutas explícitas desde la raíz del repositorio, y se hizo `git pull --rebase` antes de cada `push`.

**Comandos usados**

```bash
# Crear la rama desde master (sin hacer commits en master)
git switch master
git pull
git switch -c jfa

# Antes de cada commit: confirmar que .env no aparece
git status

# Agregar por ruta explícita y hacer commit con mensaje descriptivo
git add backend/src/tareas/tareas.service.ts backend/src/tareas/tareas.service.spec.ts
git commit -m "feat(backend): agrega método actualizar en TareasService con prueba unitaria"

# Integrar los cambios del compañero y publicar
git pull --rebase
git push -u origin jfa      # la primera vez; después basta con git push
```

**Commits principales** (historial completo: `git log --oneline jfa`)

| Área | Commit |
|---|---|
| Backend | `feat(backend): agrega método actualizar en TareasService con prueba unitaria` |
| Backend | `feat(backend): agrega ruta PATCH /tareas/:id con 404 y pruebas de integración` |
| Backend | `feat(backend): agrega método eliminar en TareasService con prueba unitaria` |
| Backend | `feat(backend): agrega ruta DELETE /tareas/:id con 404 y pruebas de integración` |
| Frontend | `Agrego actualizar y eliminar en el servicio HTTP` |
| Frontend | `Implementacion de edicion de tareas y manejo de errores en TareasComponent` |
| Corrección | `fix(frontend): usa PATCH en actualizar para coincidir con el backend` |
| Corrección | `fix(frontend): eliminar devuelve Observable<Tarea> según el contrato` |
| Evidencias | `docs: agrega pantallazos de evidencia de entorno y backend` |
| Evidencias | `docs: agrega pantallazos de la prueba manual de extremo a extremo` |
| Evidencias | `docs(frontend): agrega evidencias del servicio, componente y pruebas` |
| Documento | `docs: agrega ENTREGA.md y evidencias` |

![git log del frontend](evidencias/fe-04-git-log.png)
