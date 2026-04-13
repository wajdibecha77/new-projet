import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardVisiteurComponent } from './dashboard-visiteur.component';

describe('DashboardVisiteurComponent', () => {
  let component: DashboardVisiteurComponent;
  let fixture: ComponentFixture<DashboardVisiteurComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardVisiteurComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardVisiteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
