import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../environments/environment';

export interface ParkingSlot {
  id: string;
  type: 'REGULAR' | 'EV' | 'VIP';
  floor: string;
  status: 'AVAILABLE' | 'OCCUPIED';
  baseRatePerHour: number;
  currentDynamicRate: number;
  currentVehicle?: string;
  lockedRatePerHour?: number | null;
}

export interface ParkingLog {
  _id: string;
  vehicleNo: string;
  slotId: string;
  floor: string;
  type: string;
  entryTime: string;
  exitTime: string;
  durationMinutes: number;
  billableHours: number;
  ratePerHour: number;
  totalAmount: number;
  isGracePeriod: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService implements OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private pollingTimer: any = null;

  // Signals State
  slots = signal<ParkingSlot[]>([]);
  logs = signal<ParkingLog[]>([]);
  isLoading = signal<boolean>(false);

  fetchSlots() {
    this.http.get<{ success: boolean; data: ParkingSlot[] }>(`${this.apiUrl}/slots`)
      .subscribe({
        next: (res) => this.slots.set(res.data),
        error: (err) => console.error('Fetch slots error:', err)
      });
  }

  fetchLogs() {
    this.http.get<{ success: boolean; data: ParkingLog[] }>(`${this.apiUrl}/logs`)
      .subscribe({
        next: (res) => this.logs.set(res.data),
        error: (err) => console.error('Fetch logs error:', err)
      });
  }

  // 1. Auto-Polling Setup (Har 3.5 seconds me background sync)
  startPolling(intervalMs: number = 3500) {
    this.fetchSlots();
    if (!this.pollingTimer) {
      this.pollingTimer = setInterval(() => {
        this.fetchSlots();
      }, intervalMs);
    }
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  bookSlot(vehicleNo: string, type: string, preferredSlotId?: string) {
    return this.http.post<{ success: boolean; message: string; session: any }>(
      `${this.apiUrl}/book-slot`,
      { vehicleNo, type, preferredSlotId }
    ).pipe(
      tap(() => {
        this.fetchSlots();
      })
    );
  }

  exitSlot(vehicleNo: string) {
    return this.http.post<{ success: boolean; receipt: any }>(
      `${this.apiUrl}/exit-slot`,
      { vehicleNo }
    ).pipe(
      tap(() => {
        this.fetchSlots();
        this.fetchLogs();
      })
    );
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}