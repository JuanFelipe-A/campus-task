import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Tarea } from './tarea.model';
import { TareasComponent } from './tareas.component';
import { TareasService } from './tareas.service';

describe('TareasComponent', () => {
  let fixture: ComponentFixture<TareasComponent>;
  let tareasService: jasmine.SpyObj<TareasService>;

  const iniciales: Tarea[] = [
    { id: 1, titulo: 'Leer la guía de la clase 2' },
  ];

  beforeEach(async () => {
    tareasService = jasmine.createSpyObj('TareasService', ['listar', 'crear' , 'actualizar', 'eliminar']);
    tareasService.listar.and.returnValue(of(iniciales));

    await TestBed.configureTestingModule({
      imports: [TareasComponent],
      providers: [{ provide: TareasService, useValue: tareasService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TareasComponent);
    fixture.detectChanges();
  });

  it('muestra el id y el título de cada tarea', () => {
    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelector('.numero')?.textContent).toContain('1');
    expect(elemento.querySelector('.titulo')?.textContent).toContain(
      'Leer la guía de la clase 2',
    );
    expect(tareasService.listar).toHaveBeenCalled();
  });

  it('agrega la tarea creada al hacer clic en Agregar', () => {
    tareasService.crear.and.returnValue(
      of({ id: 2, titulo: 'Preparar el entorno' }),
    );

    const elemento: HTMLElement = fixture.nativeElement;
    const input = elemento.querySelector('input');
    expect(input).not.toBeNull();
    input!.value = 'Preparar el entorno';
    elemento.querySelector('button')!.click();
    fixture.detectChanges();

    expect(tareasService.crear).toHaveBeenCalledWith('Preparar el entorno');
    const titulos = Array.from(elemento.querySelectorAll('.titulo')).map(
      (nodo) => nodo.textContent,
    );
    expect(titulos).toEqual([
      'Leer la guía de la clase 2',
      'Preparar el entorno',
    ]);
  });
  it('edita una tarea al pulsar Editar y Guardar', () => {
    tareasService.actualizar.and.returnValue(
      of({ id: 1, titulo: 'Título nuevo' }),
    );

    const elemento: HTMLElement = fixture.nativeElement;
    const botonPorTexto = (texto: string) =>
      Array.from(elemento.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === texto,
      ) as HTMLButtonElement;

    botonPorTexto('Editar').click();
    fixture.detectChanges();

    const campo = elemento.querySelector('.editar-input') as HTMLInputElement;
    expect(campo).not.toBeNull();
    campo.value = 'Título nuevo';
    campo.dispatchEvent(new Event('input'));

    botonPorTexto('Guardar').click();
    fixture.detectChanges();

    expect(tareasService.actualizar).toHaveBeenCalledWith(1, 'Título nuevo');
    const titulos = Array.from(elemento.querySelectorAll('.titulo')).map(
      (nodo) => nodo.textContent,
    );
    expect(titulos).toEqual(['Título nuevo']);
  });

  it('elimina una tarea al pulsar Eliminar', () => {
    tareasService.eliminar.and.returnValue(
      of({ id: 1, titulo: 'Leer la guía de la clase 2' }),
    );

    const elemento: HTMLElement = fixture.nativeElement;
    const eliminar = Array.from(elemento.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Eliminar',
    ) as HTMLButtonElement;

    eliminar.click();
    fixture.detectChanges();

    expect(tareasService.eliminar).toHaveBeenCalledWith(1);
    expect(elemento.querySelectorAll('.titulo').length).toBe(0);
  });
});
