import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingOrdersComponent } from './listing-orders.component';

describe('ListingOrdersComponent', () => {
  let component: ListingOrdersComponent;
  let fixture: ComponentFixture<ListingOrdersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListingOrdersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListingOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
