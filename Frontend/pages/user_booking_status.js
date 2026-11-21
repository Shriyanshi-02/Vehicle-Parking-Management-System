Vue.component('user_booking_status', {
  data() {
    return {
      bookings: [], // List of all bookings
      filteredBookings: [], // Filtered list of bookings for search
      searchQuery: '', // Search query input
      loading: false,
      error: ''
    };
  },
  created() {
    this.fetchBookings();
  },
  methods: {
    async fetchBookings() {
      this.loading = true;
      try {
        const res = await fetch('/api/user/bookings');
        if (!res.ok) throw new Error('Failed to fetch bookings');
        this.bookings = await res.json();
        this.filteredBookings = this.bookings; // Initialize filtered bookings
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    filterBookings() {
      const query = this.searchQuery.toLowerCase();
      this.filteredBookings = this.bookings.filter(b =>
        (b.lot_name && b.lot_name.toLowerCase().includes(query)) ||
        (b.spot_number && b.spot_number.toLowerCase().includes(query)) ||
        (b.status && b.status.toLowerCase().includes(query))
      );
    },
    async parkSpot(booking) {
      try {
        const res = await fetch('/api/user/park_spot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lot_name: booking.lot_name,
            spot_number: booking.spot_number,
            start_time: booking.start_time
          })
        });
        if (!res.ok) throw new Error('Failed to park spot');
        this.fetchBookings();
        alert('Spot parked! Status is now Occupied.');
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    async vacateSpot(booking) {
      try {
        const res = await fetch('/api/user/vacate_spot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lot_name: booking.lot_name,
            spot_number: booking.spot_number,
            start_time: booking.start_time
          })
        });
        if (!res.ok) throw new Error('Failed to complete booking');
        this.fetchBookings();
        alert('Booking completed!');
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    isBetweenNow(start, end) {
      const now = new Date();
      const startTime = new Date(start);
      const endTime = new Date(end);
      return now >= startTime && now < endTime;
    },
    isAfterNow(time) {
      const now = new Date();
      const t = new Date(time);
      return now > t;
    }
  },
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container mt-4">
        <h3>Your Booking Status</h3>
        <div v-if="loading">Loading...</div>
        <div v-if="error" style="color:red;">{{ error }}</div>
        
        <!-- Search Bar -->
        <div class="mb-3">
          <input
            type="text"
            class="form-control"
            placeholder="Search by lot name, spot number, or status"
            v-model="searchQuery"
            @input="filterBookings"
          />
        </div>

        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Spot</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in filteredBookings" :key="b.start_time + b.spot_number">
              <td>{{ b.lot_name }}</td>
              <td>{{ b.spot_number }}</td>
              <td>{{ b.start_time }}</td>
              <td>{{ b.end_time }}</td>
              <td>
                <span v-if="b.status === 'active'" style="color:orange;">Occupied</span>
                <span v-else-if="b.status === 'not_parked'" style="color:red;">Not Parked</span>
                <span v-else-if="b.status === 'reserved'" style="color:blue;">Reserved</span>
                <span v-else-if="b.status === 'completed'" style="color:green;">Completed</span>
                <span v-else>{{ b.status }}</span>
              </td>
              <td>{{ b.amount || '-' }}</td>
              <td>
                <button
                  v-if="b.status === 'reserved' && isBetweenNow(b.start_time, b.end_time)"
                  class="btn btn-primary btn-sm"
                  @click="parkSpot(b)"
                >Park</button>
                <button
                  v-else-if="b.status === 'active'"
                  class="btn btn-success btn-sm"
                  @click="vacateSpot(b)"
                >Vacate</button>
                <span v-else-if="b.status === 'completed'" style="color:green;">Done</span>
                <span v-else-if="b.status === 'not_parked'" style="color:red;">Reject</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
});