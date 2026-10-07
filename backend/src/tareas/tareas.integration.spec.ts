import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DatabaseService } from '../database/database.service';
import { TareasController } from './tareas.controller';
import { TareasService } from './tareas.service';

describe('Tareas HTTP', () => {
  let app: INestApplication;
  const query = jest.fn();

  beforeEach(async () => {
    query.mockReset();

    const module = await Test.createTestingModule({
      controllers: [TareasController],
      providers: [
        TareasService,
        { provide: DatabaseService, useValue: { query } },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /tareas responde las filas que devuelve la base', async () => {
    query.mockResolvedValue({
      rows: [{ id: 1, titulo: 'Leer la guía de la clase 2' }],
    });

    await request(app.getHttpServer())
      .get('/tareas')
      .expect(200)
      .expect([{ id: 1, titulo: 'Leer la guía de la clase 2' }]);
  });

  it('POST /tareas guarda el título recibido en el cuerpo', async () => {
    query.mockResolvedValue({
      rows: [{ id: 3, titulo: 'Preparar el entorno' }],
    });

    await request(app.getHttpServer())
      .post('/tareas')
      .send({ titulo: 'Preparar el entorno' })
      .expect(201)
      .expect({ id: 3, titulo: 'Preparar el entorno' });

    expect(query).toHaveBeenCalledWith(
      'INSERT INTO tareas (titulo) VALUES ($1) RETURNING id, titulo',
      ['Preparar el entorno'],
    );
  });

    it('PATCH /tareas/:id actualiza el título y responde 200 con la tarea', async () => {
    query.mockResolvedValue({
      rows: [{ id: 1, titulo: 'Título actualizado' }],
    });

    await request(app.getHttpServer())
      .patch('/tareas/1')
      .send({ titulo: 'Título actualizado' })
      .expect(200)
      .expect({ id: 1, titulo: 'Título actualizado' });

    expect(query).toHaveBeenCalledWith(
      'UPDATE tareas SET titulo = $1 WHERE id = $2 RETURNING id, titulo',
      ['Título actualizado', 1],
    );
  });

  it('PATCH /tareas/:id responde 404 si la tarea no existe', async () => {
    query.mockResolvedValue({ rows: [] });

    await request(app.getHttpServer())
      .patch('/tareas/999')
      .send({ titulo: 'No importa' })
      .expect(404);

    expect(query).toHaveBeenCalledWith(
      'UPDATE tareas SET titulo = $1 WHERE id = $2 RETURNING id, titulo',
      ['No importa', 999],
    );
  });
});
