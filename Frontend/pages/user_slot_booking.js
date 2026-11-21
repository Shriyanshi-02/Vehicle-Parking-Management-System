Vue.component('user_slot_booking', {
  data() {
    return {
      lots: [],
      selectedLot: null,
      showBookModal: false,
      bookForm: {
        vehicle_type: '',
        vehicle_number: '',
        booking_date: '',
        booking_time: '',
        end_time: ''
      },
      bookingInProgress: false,
      message: '',
      error: '',
      search: '',
      loading: false
    };
  },
  created() {
    this.fetchLots();
  },
  computed: {
    filteredLots() {
      if (!this.search) return this.lots;
      const s = this.search.toLowerCase();
      return this.lots.filter(lot =>
        (lot.location_name && lot.location_name.toLowerCase().includes(s)) ||
        (lot.address && lot.address.toLowerCase().includes(s)) ||
        (lot.city && lot.city.toLowerCase().includes(s)) ||
        (lot.state && lot.state.toLowerCase().includes(s)) ||
        (lot.country && lot.country.toLowerCase().includes(s))
      );
    }
  },
  methods: {
    async fetchLots() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('/api/parking_lots');
        if (!res.ok) throw new Error('Failed to fetch parking lots');
        this.lots = await res.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    availableSpots(lot) {
      return lot.spots ? lot.spots.filter(s => s.status === 'A').length : 0;
    },
    openBookModal(lot) {
      this.selectedLot = lot;
      this.bookForm = {
        vehicle_type: '',
        vehicle_number: '',
        booking_date: '',
        booking_time: '',
        end_time: ''
      };
      this.showBookModal = true;
      this.message = '';
      this.error = '';
    },
    closeBookModal() {
      this.showBookModal = false;
      this.selectedLot = null;
    },
    async submitBooking() {
      if (!this.selectedLot) return;
      this.bookingInProgress = true;
      this.message = '';
      this.error = '';
      try {
        const res = await fetch('/api/user/book_spot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lot_id: this.selectedLot.id,
            vehicle_type: this.bookForm.vehicle_type,
            vehicle_number: this.bookForm.vehicle_number,
            booking_date: this.bookForm.booking_date,
            booking_time: this.bookForm.booking_time,
            end_time: this.bookForm.end_time
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Booking failed');
        this.message = `Booking successful! Status: ${data.status}`;
        this.fetchLots();
        this.closeBookModal();
      } catch (e) {
        this.error = e.message;
        alert('Error: ' + e.message);
      } finally {
        this.bookingInProgress = false;
      }
    }
  },
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container mt-4">
        <h3>Book Parking Spot</h3>
        <input type="text" v-model="search" placeholder="Search lots or location..." class="form-control mb-3" />
        <div v-if="loading">Loading lots...</div>
        <div v-if="error" style="color:red;">{{ error }}</div>
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Lot Name</th>
              <th>Address</th>
              <th>City</th>
              <th>Price</th>
              <th>Available Spots</th>
              <th>Total Spots</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lot in filteredLots" :key="lot.id">
              <td>{{ lot.location_name }}</td>
              <td>{{ lot.address }}</td>
              <td>{{ lot.city }}</td>
              <td>₹{{ lot.price }}</td>
              <td>{{ availableSpots(lot) }}</td>
              <td>{{ lot.number_of_spots }}</td>
              <td>
                <button class="btn btn-success btn-sm" @click="openBookModal(lot)" :disabled="availableSpots(lot) === 0">Book</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Book Modal -->
      <div v-if="showBookModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1100;">
        <div style="background:#fff;padding:20px;min-width:320px;">
          <h4>Book Spot in {{ selectedLot.location_name }}</h4>
          <form @submit.prevent="submitBooking">
            <div>
              <label>Vehicle Type:</label>
              <input v-model="bookForm.vehicle_type" required class="form-control">
            </div>
            <div>
              <label>Vehicle Number:</label>
              <input v-model="bookForm.vehicle_number" required class="form-control">
            </div>
            <div>
              <label>Booking Date:</label>
              <input type="date" v-model="bookForm.booking_date" required class="form-control">
            </div>
            <div>
              <label>Start Time:</label>
              <input type="time" v-model="bookForm.booking_time" required class="form-control">
            </div>
            <div>
              <label>End Time:</label>
              <input type="time" v-model="bookForm.end_time" required class="form-control">
            </div>
            <div style="margin-top:10px;">
              <button type="submit" class="btn btn-success" :disabled="bookingInProgress">
                {{ bookingInProgress ? 'Booking...' : 'Book Slot' }}
              </button>
              <button type="button" class="btn btn-secondary" @click="closeBookModal" style="margin-left:10px;">Cancel</button>
            </div>
          </form>
          <div v-if="message" style="color:green;">{{ message }}</div>
          <div v-if="error" style="color:red;">{{ error }}</div>
        </div>
      </div>
    </div>
  `
});