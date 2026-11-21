Vue.component('user_dashboard', {
  data() {
    return {
      stats: null,
      loading: false,
      error: '',
      chartLoading: false,
      monthlyActivity: [],
      statusBreakdown: {},
      chartRefreshKey: 0,
      chartError: '',
      user: null,
      showEditModal: false,
      editForm: {
        username: '',
        email: '',
        phone_number: '',
        city: '',
        state: '',
        country: '',
        address: '',
        pin_code: '',
        user_profile_picture: ''
      }
    };
  },
  created() {
    this.fetchStats();
    this.fetchChartData();
    this.fetchUser();
  },
  methods: {
    async fetchUser() {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) throw new Error('Failed to fetch user profile');
        const data = await res.json();
        this.user = data.user;
        if (this.user) {
          Object.assign(this.editForm, this.user);
        }
      } catch (e) {
        this.error = e.message;
      }
    },
    openEditModal() {
      if (this.user) Object.assign(this.editForm, this.user);
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
    },
    async saveProfile() {
      try {
        const res = await fetch('/api/user/edit_profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.editForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update profile');
        this.user = data.user;
        this.showEditModal = false;
        alert('Profile updated!');
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    onFileChange(e) {
      const file = e.target.files[0];
      if (!file) {
        this.editForm.user_profile_picture = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        this.editForm.user_profile_picture = event.target.result;
      };
      reader.readAsDataURL(file);
    },
    async fetchStats() {
      this.loading = true;
      try {
        const res = await fetch('/api/user/bookings');
        if (!res.ok) throw new Error('Failed to fetch user history');
        const history = await res.json();
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        let total = history.length;
        let currentMonth = history.filter(h => {
          const d = new Date(h.start_time);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        }).length;
        let active = history.filter(h => h.status === 'active' || h.status === 'reserved').length;
        let totalSpots = history.length;
        let totalSpend = history.reduce((sum, h) => sum + (h.amount || 0), 0);
        this.stats = {
          total,
          currentMonth,
          active,
          totalSpots,
          totalSpend
        };
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async fetchChartData() {
      this.chartLoading = true;
      try {
        const activityRes = await fetch('/api/user/monthly_activity_chart');
        if (!activityRes.ok) throw new Error('No valid monthly activity data');
        const activityData = await activityRes.json();
        this.monthlyActivity = Array.isArray(activityData.months) ? activityData.months : [];
        const statusRes = await fetch('/api/user/status_breakdown_chart');
        if (!statusRes.ok) throw new Error('No valid status breakdown data');
        const statusData = await statusRes.json();
        this.statusBreakdown = statusData.status && typeof statusData.status === 'object' ? statusData.status : {};
        this.chartError = '';
        this.chartRefreshKey++;
      } catch (e) {
        this.chartError = "No chart is visible because there is no valid data available.";
        this.monthlyActivity = [];
        this.statusBreakdown = {};
      } finally {
        this.chartLoading = false;
      }
    },
    renderBarChart() {
      if (!window.Chart || !this.monthlyActivity.length) return;
      const ctx = document.getElementById('userBarChart');
      if (!ctx) return;
      if (ctx._chart) { ctx._chart.destroy(); }
      const labels = this.monthlyActivity.map(m => m.month);
      const data = this.monthlyActivity.map(m => m.count);
      ctx._chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Bookings',
            data,
            backgroundColor: '#2196f3'
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false }, tooltip: { enabled: true } }
        }
      });
    },
    renderPieChart() {
      if (!window.Chart || !Object.keys(this.statusBreakdown).length) return;
      const ctx = document.getElementById('userPieChart');
      if (!ctx) return;
      if (ctx._chart) { ctx._chart.destroy(); }
      const labels = Object.keys(this.statusBreakdown);
      const data = Object.values(this.statusBreakdown);
      ctx._chart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: [
              '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { enabled: true }
          }
        }
      });
    }
  },
  watch: {
    monthlyActivity() {
      this.$nextTick(this.renderBarChart);
    },
    statusBreakdown() {
      this.$nextTick(this.renderPieChart);
    },
    chartRefreshKey() {
      this.$nextTick(() => {
        this.renderBarChart();
        this.renderPieChart();
      });
    }
  },
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container mt-4">
        <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
        <div v-if="chartError" class="alert alert-warning" role="alert">{{ chartError }}</div>
        <div class="row">
          <div class="col-md-4">
            <div class="card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <span>User Profile</span>
                <button class="btn btn-sm btn-outline-primary" @click="openEditModal">Edit</button>
              </div>
              <div class="card-body" v-if="user">
                <div class="text-center mb-3">
                  <img v-if="user.user_profile_picture" :src="user.user_profile_picture" alt="Profile" style="width:100px;height:100px;border-radius:50%;object-fit:cover;">
                  <div v-else class="bg-secondary text-white rounded-circle" style="width:100px;height:100px;line-height:100px;font-size:2rem;margin:auto;">?</div>
                </div>
                <table class="table table-borderless">
                  <tr><th>Name:</th><td>{{ user.username }}</td></tr>
                  <tr><th>Email:</th><td>{{ user.email }}</td></tr>
                  <tr><th>Phone:</th><td>{{ user.phone_number }}</td></tr>
                  <tr><th>City:</th><td>{{ user.city }}</td></tr>
                  <tr><th>State:</th><td>{{ user.state }}</td></tr>
                  <tr><th>Country:</th><td>{{ user.country }}</td></tr>
                  <tr><th>Address:</th><td>{{ user.address }}</td></tr>
                  <tr><th>Pincode:</th><td>{{ user.pin_code }}</td></tr>
                </table>
              </div>
              <div v-else class="text-muted">No profile data available.</div>
            </div>
          </div>
          <div class="col-md-8">
            <h2>User Dashboard</h2>
            <div v-if="loading">Loading stats...</div>
            <div v-if="stats" class="row mb-4">
              <div class="col-md-3">
                <div class="card text-center">
                  <div class="card-body">
                    <h5 class="card-title">Total Bookings</h5>
                    <p class="card-text display-6">{{ stats.total }}</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card text-center">
                  <div class="card-body">
                    <h5 class="card-title">This Month</h5>
                    <p class="card-text display-6">{{ stats.currentMonth }}</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card text-center">
                  <div class="card-body">
                    <h5 class="card-title">Active Bookings</h5>
                    <p class="card-text display-6">{{ stats.active }}</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card text-center">
                  <div class="card-body">
                    <h5 class="card-title">Total Spots Booked</h5>
                    <p class="card-text display-6">{{ stats.totalSpots }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mb-4">
              <div class="col-12">
                <div class="card mb-4">
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Monthly Parking Activity</span>
                    <button class="btn btn-sm btn-outline-primary" @click="fetchChartData" :disabled="chartLoading">
                      Refresh
                    </button>
                  </div>
                  <div class="card-body">
                    <canvas
                      v-if="monthlyActivity.length"
                      :key="'bar-' + chartRefreshKey"
                      id="userBarChart"
                      style="max-width:100%;height:200px;"
                    ></canvas>
                    <div v-else class="text-muted">No activity data available.</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mb-4">
              <div class="col-12">
                <div class="card">
                  <div class="card-header">Booking Status Breakdown</div>
                  <div class="card-body">
                    <canvas
                      v-if="Object.keys(statusBreakdown).length"
                      :key="'pie-' + chartRefreshKey"
                      id="userPieChart"
                      style="max-width:100%;height:200px;"
                    ></canvas>
                    <div v-else class="text-muted">No status data available.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Edit Profile Modal -->
        <div v-if="showEditModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1100;">
          <div style="background:#fff;padding:20px;min-width:350px;">
            <h4>Edit Profile</h4>
            <form @submit.prevent="saveProfile">
              <div class="mb-2">
                <label>Name:</label>
                <input v-model="editForm.username" required class="form-control">
              </div>
              <div class="mb-2">
                <label>Email:</label>
                <input v-model="editForm.email" required class="form-control" type="email">
              </div>
              <div class="mb-2">
                <label>Phone:</label>
                <input v-model="editForm.phone_number" required class="form-control">
              </div>
              <div class="mb-2">
                <label>City:</label>
                <input v-model="editForm.city" class="form-control">
              </div>
              <div class="mb-2">
                <label>State:</label>
                <input v-model="editForm.state" class="form-control">
              </div>
              <div class="mb-2">
                <label>Country:</label>
                <input v-model="editForm.country" class="form-control">
              </div>
              <div class="mb-2">
                <label>Address:</label>
                <input v-model="editForm.address" class="form-control">
              </div>
              <div class="mb-2">
                <label>Pincode:</label>
                <input v-model="editForm.pin_code" class="form-control">
              </div>
              <div class="mb-2">
                <label>Profile Picture:</label>
                <input type="file" class="form-control" @change="onFileChange">
                <img v-if="editForm.user_profile_picture" :src="editForm.user_profile_picture" alt="Profile" style="width:80px;height:80px;border-radius:50%;margin-top:10px;">
              </div>
              <div style="margin-top:10px;">
                <button type="submit" class="btn btn-success">Save</button>
                <button type="button" class="btn btn-secondary" @click="closeEditModal" style="margin-left:10px;">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
});