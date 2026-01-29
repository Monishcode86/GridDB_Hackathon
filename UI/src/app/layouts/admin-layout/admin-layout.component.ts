import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {  DatePipe, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive, RouterOutlet,MatIconModule,DatePipe ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
currentDateTime: Date = new Date();
  isCollapsed = true;
  isMobile = false;
  sidebarVisible = false;

  openSubmenuIndex: number | null = null;
  hoverMenuIndex: number | null = null;
 sidebarOpen: boolean = false;
  menuItems = [
    { label: 'OEE', icon: 'dashboard', route: '/dashboard' },
    { label: 'Energy', icon: 'bolt', route: '/energydashboard' },
    { label: 'Test', icon: 'bolt', route: '/test' },
    { 
      label: 'Settings', icon: 'settings',
      submenu: [
        { label: 'Devices', route: '/settings/device' }
      ]
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkScreenSize();
    this.expandActiveParent();
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000);
  }

  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.sidebarVisible = false;
    }
  }

  toggleSidebar() {
     this.sidebarOpen = !this.sidebarOpen;
    if (this.isMobile) {
      this.sidebarVisible = !this.sidebarVisible;
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.hoverMenuIndex = null;
    }
  }

  toggleSubmenu(index: number) {
    this.openSubmenuIndex =
      this.openSubmenuIndex === index ? null : index;
  }

  selectMenu(index?: number) {
    if (this.isMobile) this.sidebarVisible = false;
  }

  selectSubmenu() {
    if (this.isMobile) this.sidebarVisible = false;
  }

  onHoverMenu(index: number | null) {
    if (this.isCollapsed && !this.isMobile) {
      this.hoverMenuIndex = index;
    }
  }

  logout() {
    sessionStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  expandActiveParent() {
    const currentUrl = this.router.url;
    this.menuItems.forEach((item, i) => {
      if (item.submenu) {
        const match = item.submenu.some(sub => sub.route === currentUrl);
        if (match) this.openSubmenuIndex = i;
      }
    });
  }
}
