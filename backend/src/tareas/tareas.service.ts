import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Tarea } from './tarea.model';

@Injectable()
export class TareasService {
      constructor(private readonly db: DatabaseService) { }

      async listar(): Promise<Tarea[]> {
            const resultado = await this.db.query<Tarea>(
                  'SELECT id, titulo FROM tareas ORDER BY id',
            );
            return resultado.rows;
      }

      async crear(titulo: string): Promise<Tarea> {
            const resultado = await this.db.query<Tarea>(
                  'INSERT INTO tareas (titulo) VALUES ($1) RETURNING id, titulo',
                  [titulo],
            )
            return resultado.rows[0];
      }

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
}
