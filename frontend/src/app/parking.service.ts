import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api';

  // Signals State
  slots = signal<ParkingSlot[]>([]);
  isLoading = signal<boolean>(false);
  message = signal<string>('');

  fetchSlots() {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; data: ParkingSlot[] }>(`${this.apiUrl}/slots`)
      .subscribe({
        next: (res) => {
          this.slots.set(res.data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Fetch slots error:', err);
          this.isLoading.set(false);
        }
      });
  }

//   bookSlot(vehicleNo: string, type: string) {
//     return this.http.post<{ success: boolean; message: string; session: any }>(
//       `${this.apiUrl}/book-slot`,
//       { vehicleNo, type }
//     ).pipe(
//       tap(() => this.fetchSlots()) // Slot book hote hi UI automatically refresh
//     );
//   }

  bookSlot(vehicleNo: string, type: string, preferredSlotId?: string) {
    return this.http.post<{ success: boolean; message: string; session: any }>(
      `${this.apiUrl}/book-slot`,
      { vehicleNo, type, preferredSlotId }
    ).pipe(
      tap(() => this.fetchSlots())
    );
  }

  exitSlot(vehicleNo: string) {
    return this.http.post<{ success: boolean; receipt: any }>(
      `${this.apiUrl}/exit-slot`,
      { vehicleNo }
    ).pipe(
      tap(() => this.fetchSlots()) // Slot release hote hi UI refresh
    );
  }
}