import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgClass, NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {

  isCollapsed = true;
  isMobile = false;
  sidebarVisible = false;

  openSubmenuIndex: number | null = null;
  hoverMenuIndex: number | null = null;

  menuItems = [
    {
      label: 'Dashboard',
      icon: 'fas fa-home',
      route: '/dashboard'
    },
    {
      label: 'Settings',
      icon: 'fas fa-cog',
      submenu: [
        { label: 'Devices', route: '/settings/device' },
        { label: 'User', route: '/settings/user' },
        { label: 'Shift', route: '/settings/shift' }
      ]
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkScreenSize();
    this.expandActiveParent();
  }

  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.sidebarVisible = false;
    }
  }

  toggleSidebar() {
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
