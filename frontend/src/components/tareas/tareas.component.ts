import { Component, OnInit, inject, signal } from '@angular/core';
import { Tarea } from './tarea.model';
import { TareasService } from './tareas.service';
import {HttpErrorResponse} from "@angular/common/http";

@Component({
  selector: 'app-tareas',
  standalone: true,
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css',
})
export class TareasComponent implements OnInit {
  private readonly tareasService = inject(TareasService);
  tareas = signal<Tarea[]>([]);
  editandoId = signal<number | null>(null);
  tituloEditado = signal('');
  error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  crear(titulo: string) {
    this.tareasService.crear(titulo).subscribe((tarea) => {
      this.tareas.update((tareas) => [...tareas, tarea]);
    });
  }

  cargar() {
    this.tareasService.listar().subscribe((tareas) => {
      this.tareas.set(tareas);
    });
  }

  editar(tarea: Tarea) {
    this.error.set('');
    this.editandoId.set(tarea.id);
    this.tituloEditado.set(tarea.titulo);
  }
  cancelar() {
    this.editandoId.set(null);
  }

  guardar(tarea: Tarea) {
    this.error.set('');
    this.tareasService.actualizar(tarea.id, this.tituloEditado()).subscribe({
      next: (actualizada) => {
        this.tareas.update((tareas) =>
          tareas.map((t) => (t.id === actualizada.id ? actualizada : t)),
        );
        this.editandoId.set(null);
      },
      error: (e: HttpErrorResponse) => this.manejarError(e),
    });
  }

  eliminar(tarea: Tarea) {
    this.error.set('');
    this.tareasService.eliminar(tarea.id).subscribe({
    next: () => {
      this.tareas.update((tareas) => tareas.filter((t) => t.id !== tarea.id));
    },
    error: (e: HttpErrorResponse) => this.manejarError(e),
    });
  }

  private manejarError(e: HttpErrorResponse) {
    this.editandoId.set(null);
    if (e.status === 404) {
      this.error.set('La tarea ya no existe. Se recargó la lista.');
      this.cargar();
    } else {
      this.error.set('No se pudo completar la operación. Intenta de nuevo.');
    }
  }
}