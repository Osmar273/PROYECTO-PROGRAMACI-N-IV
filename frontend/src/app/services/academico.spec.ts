import { TestBed } from '@angular/core/testing';

import { Academico } from './academico';

describe('Academico', () => {
  let service: Academico;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Academico);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
