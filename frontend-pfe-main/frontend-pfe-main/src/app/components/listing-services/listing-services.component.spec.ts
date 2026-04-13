import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingServicesComponent } from './listing-services.component';

describe('ListingServicesComponent', () => {
  let component: ListingServicesComponent;
  let fixture: ComponentFixture<ListingServicesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListingServicesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListingServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
