import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginVerifyComponent } from './login-verify.component';

describe('LoginVerifyComponent', () => {
  let component: LoginVerifyComponent;
  let fixture: ComponentFixture<LoginVerifyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoginVerifyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginVerifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
