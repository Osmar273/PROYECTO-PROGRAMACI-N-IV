import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private container: HTMLDivElement | null = null;

  private getContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px;width:100%;pointer-events:none;';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message: string, type: ToastType = 'info', duration: number = 4000) {
    const container = this.getContainer();
    const toast = document.createElement('div');
    const colors = {
      success: { bg: '#d1e7dd', border: '#0f5132', text: '#0f5132', icon: '✓' },
      error: { bg: '#f8d7da', border: '#842029', text: '#842029', icon: '✕' },
      info: { bg: '#cff4fc', border: '#055160', text: '#055160', icon: 'ℹ' },
      warning: { bg: '#fff3cd', border: '#664d03', text: '#664d03', icon: '⚠' }
    };
    const c = colors[type];
    toast.style.cssText = `background:${c.bg};border-left:4px solid ${c.border};color:${c.text};padding:14px 18px;border-radius:6px;font-size:14px;font-weight:500;pointer-events:auto;animation:slideIn 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;gap:10px;`;
    toast.innerHTML = `<span style="font-size:18px;font-weight:bold">${c.icon}</span><span style="flex:1">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error'); }
  info(msg: string) { this.show(msg, 'info'); }
  warning(msg: string) { this.show(msg, 'warning'); }
}
