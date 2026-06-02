import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocenteDashboard } from './docente-dashboard';

describe('DocenteDashboard', () => {
  let component: DocenteDashboard;
  let fixture: ComponentFixture<DocenteDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(DocenteDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
