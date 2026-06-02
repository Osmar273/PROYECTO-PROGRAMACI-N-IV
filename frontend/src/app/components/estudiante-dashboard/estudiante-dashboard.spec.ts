import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstudianteDashboard } from './estudiante-dashboard';

describe('EstudianteDashboard', () => {
  let component: EstudianteDashboard;
  let fixture: ComponentFixture<EstudianteDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstudianteDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(EstudianteDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
