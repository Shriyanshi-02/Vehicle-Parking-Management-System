Vue.component('admin_history', {
  data() {
    return {
      users: [], // List of all users
      filteredUsers: [], // Filtered list of users for search
      searchQuery: '', // Search query input
      loading: false,
      error: '',
      selectedUser: null, // Selected user for viewing reservations
      reservations: [], // Reservations of the selected user
      showModal: false, // Controls the visibility of the popup
    };
  },
  created() {
    this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      this.loading = true;
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        this.users = data;
        this.filteredUsers = this.users; // Initialize filtered users
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    filterUsers() {
      const query = this.searchQuery.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      );
    },
    async viewUserReservations(user) {
      this.selectedUser = user;
      this.showModal = true;
      this.loading = true;
      try {
        const res = await fetch(`/api/admin/user_reservations/${user.id}`);
        if (!res.ok) throw new Error('Failed to fetch user reservations');
        this.reservations = await res.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    closeModal() {
      this.showModal = false;
      this.selectedUser = null;
      this.reservations = [];
    },
  },
  template: `
    <div>
      <admin-navbar></admin-navbar>
      <div class="container mt-4">
        <h3>Booking History</h3>
        <div v-if="loading">Loading...</div>
        <div v-if="error" style="color:red;">{{ error }}</div>
        
        <!-- Search Bar -->
        <div class="mb-3">
          <input
            type="text"
            class="form-control"
            placeholder="Search by name or email"
            v-model="searchQuery"
            @input="filterUsers"
          />
        </div>

        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Total Bookings</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.total_bookings }}</td>
              <td>
                <button class="btn btn-primary btn-sm" @click="viewUserReservations(user)">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Popup Modal -->
      <div v-if="showModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:#fff;padding:20px;width:80%;max-width:800px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.2);">
          <h4>Reservations for {{ selectedUser.name }}</h4>
          <div v-if="loading">Loading reservations...</div>
          <div v-if="error" style="color:red;">{{ error }}</div>
          <table v-if="!loading && reservations.length" class="table table-bordered table-striped mt-3">
            <thead>
              <tr>
                <th>Lot Name</th>
                <th>Spot Number</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th>Payment Status</th>
                <th>Cost</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reservation in reservations" :key="reservation.reservation_id">
                <td>{{ reservation.lot_name }}</td>
                <td>{{ reservation.spot_number }}</td>
                <td>{{ reservation.start_time }}</td>
                <td>{{ reservation.end_time }}</td>
                <td>{{ reservation.status }}</td>
                <td>{{ reservation.payment_status }}</td>
                <td>{{ reservation.parking_cost }}</td>
                <td>{{ reservation.remarks }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!loading && !reservations.length" class="text-center">No reservations found.</div>
          <div style="text-align:right;margin-top:10px;">
            <button class="btn btn-secondary" @click="closeModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `
});