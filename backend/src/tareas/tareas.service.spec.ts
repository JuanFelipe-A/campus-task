import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { TareasService } from './tareas.service';

describe('TareasService', () => {
  let service: TareasService;
  const query = jest.fn();

  beforeEach(async () => {
    query.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        TareasService,
        { provide: DatabaseService, useValue: { query } },
      ],
    }).compile();

    service = module.get(TareasService);
  });

  it('devuelve las filas de la consulta al listar', async () => {
    const tareas = [{ id: 1, titulo: 'Leer la guía de la clase 2' }];
    query.mockResolvedValue({ rows: tareas });

    await expect(service.listar()).resolves.toEqual(tareas);
    expect(query).toHaveBeenCalledWith(
      'SELECT id, titulo FROM tareas ORDER BY id',
    );
  });

  it('inserta el título y devuelve la fila creada', async () => {
    const creada = { id: 2, titulo: 'Nueva tarea' };
    query.mockResolvedValue({ rows: [creada] });

    await expect(service.crear('Nueva tarea')).resolves.toEqual(creada);
    expect(query).toHaveBeenCalledWith(
      'INSERT INTO tareas (titulo) VALUES ($1) RETURNING id, titulo',
      ['Nueva tarea'],
    );
  });
  
  it('actualiza el título por id y devuelve la fila actualizada', async () => {
    const actualizada = { id: 1, titulo: 'Título nuevo' };
    query.mockResolvedValue({ rows: [actualizada] });

    await expect(service.actualizar(1, 'Título nuevo')).resolves.toEqual(
      actualizada,
    );
    expect(query).toHaveBeenCalledWith(
      'UPDATE tareas SET titulo = $1 WHERE id = $2 RETURNING id, titulo',
      ['Título nuevo', 1],
    );
  });

});
