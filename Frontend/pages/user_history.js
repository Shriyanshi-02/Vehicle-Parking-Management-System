Vue.component('user_history', {
  data() {
    return {
      history: [],
      search: '',
      loading: false,
      error: '',
      showDetailModal: false,
      selectedBooking: null
    };
  },
  created() {
    this.fetchHistory();
  },
  computed: {
    filteredHistory() {
      if (!this.search) return this.history;
      const s = this.search.toLowerCase();
      return this.history.filter(h =>
        (h.lot_name && h.lot_name.toLowerCase().includes(s)) ||
        (h.spot_number && h.spot_number.toLowerCase().includes(s)) ||
        (h.status && h.status.toLowerCase().includes(s))
      );
    }
  },
  methods: {
    async fetchHistory() {
      this.loading = true;
      try {
        const res = await fetch('/api/user/history');
        if (!res.ok) throw new Error('Failed to fetch history');
        this.history = await res.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    viewDetails(h) {
      this.selectedBooking = h;
      this.showDetailModal = true;
    },
    closeDetailModal() {
      this.showDetailModal = false;
      this.selectedBooking = null;
    }
  },
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container mt-4">
        <h3>Your Booking History</h3>
        <input type="text" v-model="search" placeholder="Search by lot, spot, or status..." class="form-control mb-3" />
        <div v-if="loading">Loading...</div>
        <div v-if="error" style="color:red;">{{ error }}</div>
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
            <tr v-for="h in filteredHistory" :key="h.start_time + h.spot_number">
              <td>{{ h.lot_name }}</td>
              <td>{{ h.spot_number }}</td>
              <td>{{ h.start_time }}</td>
              <td>{{ h.end_time }}</td>
              <td>
                <span v-if="h.status === 'completed'" style="color:green;">Completed</span>
                <span v-else>{{ h.status }}</span>
              </td>
              <td>{{ h.amount || '-' }}</td>
              <td>
                <button class="btn btn-info btn-sm" @click="viewDetails(h)">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Booking Detail Modal -->
      <div v-if="showDetailModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1100;">
        <div style="background:#fff;padding:20px;min-width:350px;">
          <h4>Booking Details</h4>
          <div v-if="selectedBooking">
            <table class="table table-bordered">
              <tr><th>Lot</th><td>{{ selectedBooking.lot_name }}</td></tr>
              <tr><th>Spot</th><td>{{ selectedBooking.spot_number }}</td></tr>
              <tr><th>Start Time</th><td>{{ selectedBooking.start_time }}</td></tr>
              <tr><th>End Time</th><td>{{ selectedBooking.end_time }}</td></tr>
              <tr><th>Status</th><td>
                <span v-if="selectedBooking.status === 'completed'" style="color:green;">Completed</span>
                <span v-else>{{ selectedBooking.status }}</span>
              </td></tr>
              <tr><th>Amount</th><td>{{ selectedBooking.amount || '-' }}</td></tr>
            </table>
          </div>
          <div style="margin-top:10px;text-align:right;">
            <button class="btn btn-secondary" @click="closeDetailModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `
});  
