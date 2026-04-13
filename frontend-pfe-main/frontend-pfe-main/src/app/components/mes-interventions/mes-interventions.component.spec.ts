import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MesInterventionsComponent } from './mes-interventions.component';

describe('MesInterventionsComponent', () => {
  let component: MesInterventionsComponent;
  let fixture: ComponentFixture<MesInterventionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MesInterventionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MesInterventionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
