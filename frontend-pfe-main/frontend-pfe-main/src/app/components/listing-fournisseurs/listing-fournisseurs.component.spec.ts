import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingFournisseursComponent } from './listing-fournisseurs.component';

describe('ListingFournisseursComponent', () => {
  let component: ListingFournisseursComponent;
  let fixture: ComponentFixture<ListingFournisseursComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListingFournisseursComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListingFournisseursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
