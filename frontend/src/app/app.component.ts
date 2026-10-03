import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ParkingService, ParkingSlot } from './parking.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  parkingService = inject(ParkingService);

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

  // Floor Grouping (No more awkward lonely slots)
  groundFloorSlots = computed(() => 
    this.parkingService.slots().filter(s => s.floor === 'Ground')
  );
  basementSlots = computed(() => 
    this.parkingService.slots().filter(s => s.floor === 'B1')
  );

  // Filter available bays according to currently selected Vehicle Type
  matchingAvailableBays = computed(() => {
    const type = this.selectedType();
    return this.parkingService.slots().filter(
      slot => slot.status === 'AVAILABLE' && slot.type === type
    );
  });

  ngOnInit() {
    this.parkingService.fetchSlots();
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
      next: (res) => {
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