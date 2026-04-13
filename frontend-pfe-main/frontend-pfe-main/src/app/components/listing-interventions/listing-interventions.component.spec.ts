import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingInterventionsComponent } from './listing-interventions.component';

describe('ListingInterventionsComponent', () => {
  let component: ListingInterventionsComponent;
  let fixture: ComponentFixture<ListingInterventionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListingInterventionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListingInterventionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
