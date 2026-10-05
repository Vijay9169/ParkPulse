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

  // Active view mode: 'TERMINAL' (Guard View) or 'ANALYTICS' (Owner View)
  activeTab = signal<'TERMINAL' | 'ANALYTICS'>('TERMINAL');

  // Terminal signals
  vehicleNo = signal<string>('');
  selectedType = signal<string>('REGULAR');
  selectedSlotId = signal<string>('');
  exitVehicleNo = signal<string>('');
  latestReceipt = signal<any>(null);

  // Search and Filter signals for Owner Audit View
  searchQuery = signal<string>('');
  selectedFilterDate = signal<string>('');

  // Computed metrics
  totalSlots = computed(() => this.parkingService.slots().length);
  availableSlots = computed(() => 
    this.parkingService.slots().filter(s => s.status === 'AVAILABLE').length
  );
  occupancyPercentage = computed(() => {
    const total = this.totalSlots();
    if (!total) return 0;
    return Math.round(((total - this.availableSlots()) / total) * 100);
  });

  // Filtered Logs Computation
  filteredLogs = computed(() => {
    let records = this.parkingService.logs();
    const query = this.searchQuery().trim().toUpperCase();
    const date = this.selectedFilterDate();

    if (query) {
      records = records.filter(log => 
        log.vehicleNo.includes(query) || log.slotId.includes(query)
      );
    }

    if (date) {
      records = records.filter(log => {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0];
        return logDate === date;
      });
    }

    return records;
  });

  // Owner Financial Analytics (Real-time and filtered)
  totalRevenue = computed(() => 
    this.filteredLogs().reduce((sum, log) => sum + (log.totalAmount || 0), 0)
  );
  totalVehiclesHandled = computed(() => this.filteredLogs().length);

  avgTariff = computed(() => {
    const total = this.totalVehiclesHandled();
    return total ? Math.round(this.totalRevenue() / total) : 0;
  });

  // Floor groups
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

  isPaymentSettled = signal<boolean>(false);

  ngOnInit() {
    this.parkingService.startPolling(3500);
    this.parkingService.fetchLogs();
  }

  ngOnDestroy() {
    this.parkingService.stopPolling();
  }

  // Interactive Click-to-Park and Quick-Exit
  onSlotClick(slot: ParkingSlot) {
    if (slot.status === 'AVAILABLE') {
      this.selectedType.set(slot.type);
      this.selectedSlotId.set(slot.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (slot.status === 'OCCUPIED' && slot.currentVehicle) {
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
      alert('Please enter vehicle license plate.');
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
      error: (err) => alert(err.error?.message || 'Booking process failed.')
    });
  }

  onExit() {
    if (!this.exitVehicleNo().trim()) return;
    this.parkingService.exitSlot(this.exitVehicleNo().trim().toUpperCase()).subscribe({
      next: (res) => {
        this.latestReceipt.set(res.receipt);

        // Automatically settle if stay qualifies for free grace period
        this.isPaymentSettled.set(res.receipt.isGracePeriod);
        this.exitVehicleNo.set('');
      },
      error: (err) => alert(err.error?.message || 'Checkout failed.')
    });
  }

  // Method to mark payment settled manually by guard
  confirmPaymentReceived() {
    this.isPaymentSettled.set(true);
  }

  // Dynamic UPI Payment QR Code Generator URL
  getUpiQrUrl(amount: number, vehicleNo: string): string {
    const upiString = `upi://pay?pa=parkflow@upi&pn=ParkFlowParking&am=${amount}&cu=INR&tn=Parking_Fee_${vehicleNo}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiString)}`;
  }

  // Dynamic UPI Payment QR Code Generator URL
  // getUpiQrUrl(amount: number, vehicleNo: string): string {
  //   // Replace 'your-real-upi-id@bank' with an active UPI ID (e.g. mobile@paytm, name@okhdfcbank)
  //   const activeVpa = 'yourname@okaxis'; 
  //   const upiString = `upi://pay?pa=${activeVpa}&pn=ParkFlow_Parking&am=${amount}&cu=INR&tn=Parking_Fee_${vehicleNo}`;
  //   return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiString)}`;
  // }

  // Print Clearance Slip Trigger
  printReceipt() {
    window.print();
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedFilterDate.set('');
  }
}