import { TestBed } from '@angular/core/testing';

import { Estudiante } from './estudiante';

describe('Estudiante', () => {
  let service: Estudiante;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Estudiante);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
