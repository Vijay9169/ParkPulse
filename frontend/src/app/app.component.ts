import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ParkingService, ParkingSlot, ParkingLog } from './parking.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  parkingService = inject(ParkingService);

  // Active View: 'TERMINAL' (Guard View) ya 'ANALYTICS' (Owner View)
  activeTab = signal<'TERMINAL' | 'ANALYTICS'>('TERMINAL');

  // Form Signals
  vehicleNo = signal<string>('');
  selectedType = signal<string>('REGULAR');
  selectedSlotId = signal<string>('');
  exitVehicleNo = signal<string>('');
  latestReceipt = signal<any>(null);

  // Computed Metrics
  totalSlots = computed(() => this.parkingService.slots().length);
  availableSlots = computed(() => 
    this.parkingService.slots().filter(s => s.status === 'AVAILABLE').length
  );
  occupancyPercentage = computed(() => {
    const total = this.totalSlots();
    if (!total) return 0;
    return Math.round(((total - this.availableSlots()) / total) * 100);
  });

  // Owner Financial Analytics
  totalRevenue = computed(() => 
    this.parkingService.logs().reduce((sum, log) => sum + (log.totalAmount || 0), 0)
  );
  totalVehiclesHandled = computed(() => this.parkingService.logs().length);

  // Naya computed property add karein
  avgTariff = computed(() => {
    const total = this.totalVehiclesHandled();
    return total ? Math.round(this.totalRevenue() / total) : 0;
  });

  // Floor Grouping
  groundFloorSlots = computed(() => 
    this.parkingService.slots().filter(s => s.floor === 'Ground')
  );
  basementSlots = computed(() => 
    this.parkingService.slots().filter(s => s.floor === 'B1')
  );

  matchingAvailableBays = computed(() => {
    const type = this.selectedType();
    return this.parkingService.slots().filter(
      slot => slot.status === 'AVAILABLE' && slot.type === type
    );
  });

  ngOnInit() {
    this.parkingService.startPolling(3500); // 3.5s auto polling on
    this.parkingService.fetchLogs();
  }

  ngOnDestroy() {
    this.parkingService.stopPolling();
  }

  // 2. Interactive Click-to-Park / Quick-Exit
  onSlotClick(slot: ParkingSlot) {
    if (slot.status === 'AVAILABLE') {
      // Khali slot click karne par check-in deck me bay auto-select ho jaye
      this.selectedType.set(slot.type);
      this.selectedSlotId.set(slot.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (slot.status === 'OCCUPIED' && slot.currentVehicle) {
      // Occupied slot click karne par exit gate form auto-fill ho jaye
      this.exitVehicleNo.set(slot.currentVehicle);
    }
  }

  switchTab(tab: 'TERMINAL' | 'ANALYTICS') {
    this.activeTab.set(tab);
    if (tab === 'ANALYTICS') {
      this.parkingService.fetchLogs();
    }
  }

  onTypeChange(newType: string) {
    this.selectedType.set(newType);
    this.selectedSlotId.set('');
  }

  onBook() {
    if (!this.vehicleNo().trim()) {
      alert('Please enter vehicle plate number');
      return;
    }
    
    this.parkingService.bookSlot(
      this.vehicleNo().trim().toUpperCase(), 
      this.selectedType(), 
      this.selectedSlotId() || undefined
    ).subscribe({
      next: () => {
        this.vehicleNo.set('');
        this.selectedSlotId.set('');
      },
      error: (err) => alert(err.error?.message || 'Booking failed')
    });
  }

  onExit() {
    if (!this.exitVehicleNo().trim()) return;
    this.parkingService.exitSlot(this.exitVehicleNo().trim().toUpperCase()).subscribe({
      next: (res) => {
        this.latestReceipt.set(res.receipt);
        this.exitVehicleNo.set('');
      },
      error: (err) => alert(err.error?.message || 'Checkout failed')
    });
  }
}