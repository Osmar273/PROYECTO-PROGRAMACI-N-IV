import { TestBed } from '@angular/core/testing';

import { Docente } from './docente';

describe('Docente', () => {
  let service: Docente;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Docente);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
