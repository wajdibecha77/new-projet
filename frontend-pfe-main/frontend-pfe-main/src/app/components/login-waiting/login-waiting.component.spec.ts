import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginWaitingComponent } from './login-waiting.component';

describe('LoginWaitingComponent', () => {
  let component: LoginWaitingComponent;
  let fixture: ComponentFixture<LoginWaitingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoginWaitingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginWaitingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
