import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  bodyClasses: string = 'clicked';

  constructor(private router: Router) {}

  goToCreate($myParam: string = ''): void {
    this.router.navigate([`${$myParam}`]);
  }

  ngOnInit(): void {}
}
