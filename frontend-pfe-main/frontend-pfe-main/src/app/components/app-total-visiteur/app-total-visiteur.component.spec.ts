import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppTotalVisiteurComponent } from './app-total-visiteur.component';

describe('AppTotalVisiteurComponent', () => {
  let component: AppTotalVisiteurComponent;
  let fixture: ComponentFixture<AppTotalVisiteurComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AppTotalVisiteurComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppTotalVisiteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
