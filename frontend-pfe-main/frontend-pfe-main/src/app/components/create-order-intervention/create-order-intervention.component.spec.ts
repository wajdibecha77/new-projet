import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateOrderInterventionComponent } from './create-order-intervention.component';

describe('CreateOrderInterventionComponent', () => {
  let component: CreateOrderInterventionComponent;
  let fixture: ComponentFixture<CreateOrderInterventionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateOrderInterventionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateOrderInterventionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
