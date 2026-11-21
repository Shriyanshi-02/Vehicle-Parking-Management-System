Vue.component('admin_dashboard', {
  data() {
    return {
      admin: null,
      stats: null,
      loading: false,
      error: '',
      chartLoading: false,
      lotStatusData: [],
      revenueData: [],
      chartRefreshKey: 0
    };
  },
  created() {
    this.fetchProfileStats();
    this.fetchChartData();
  },
  methods: {
    async fetchProfileStats() {
      this.loading = true;
      try {
        const res = await fetch('/api/admin/profile_stats');
        if (!res.ok) throw new Error('Failed to fetch admin profile/stats');
        const data = await res.json();
        this.admin = data.admin;
        this.stats = data.stats;
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async fetchChartData() {
      this.chartLoading = true;
      try {
        const lotRes = await fetch('/api/admin/lot_status_chart');
        const lotData = await lotRes.json();
        this.lotStatusData = lotData.lots || [];

        const revenueRes = await fetch('/api/admin/revenue_chart');
        const revenueData = await revenueRes.json();
        this.revenueData = revenueData.lots || [];

        this.chartRefreshKey++;
      } catch (e) {
        this.error = 'Chart data error: ' + e.message;
      } finally {
        this.chartLoading = false;
      }
    },
    renderBarChart() {
      if (!window.Chart || !this.lotStatusData.length) return;
      const ctx = document.getElementById('lotBarChart');
      if (!ctx) return;
      if (ctx._chart) { ctx._chart.destroy(); }
      const labels = this.lotStatusData.map(l => l.name);
      const available = this.lotStatusData.map(l => l.available);
      const reserved = this.lotStatusData.map(l => l.reserved);
      const occupied = this.lotStatusData.map(l => l.occupied);
      ctx._chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Available', data: available, backgroundColor: 'green' },
            { label: 'Reserved', data: reserved, backgroundColor: 'blue' },
            { label: 'Occupied', data: occupied, backgroundColor: 'orange' }
          ]
        },
        options: {
          responsive: true,
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
          plugins: { legend: { position: 'top' }, tooltip: { enabled: true } }
        }
      });
    },
    renderPieChart() {
      if (!window.Chart || !this.revenueData.length) return;
      const ctx = document.getElementById('revenuePieChart');
      if (!ctx) return;
      if (ctx._chart) { ctx._chart.destroy(); }
      const labels = this.revenueData.map(l => l.name);
      const data = this.revenueData.map(l => l.revenue);
      ctx._chart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: [
              '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#8bc34a', '#ffc107'
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
    lotStatusData() {
      this.$nextTick(this.renderBarChart);
    },
    revenueData() {
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
      <admin-navbar></admin-navbar>
      <div class="container mt-4">
        <h2>Admin Dashboard</h2>

        <!-- Admin Profile Card -->
        <div v-if="admin" class="card mb-4">
          <div class="card-body text-center">
            <h5 class="card-title">{{ admin.username }}</h5>
            <p class="card-text">{{ admin.email }}</p>
            <span class="badge bg-primary">{{ admin.role }}</span>
          </div>
        </div>

        <!-- Stat Cards -->
        <div v-if="stats" class="row mb-4">
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body">
                <h5 class="card-title">Total Parking Lots</h5>
                <p class="card-text display-6">{{ stats.total_lots }}</p>
              </div>
            </div>
          </div>
          <div class="col-md-3 mx-auto">
            <div class="card text-center">
              <div class="card-body">
                <h5 class="card-title">Total Spots</h5>
                <p class="card-text display-6">{{ stats.total_spots }}</p>
                <small>
                  <span style="color:green;">Available: {{ stats.available }}</span><br>
                  <span style="color:blue;">Reserved: {{ stats.reserved }}</span><br>
                  <span style="color:orange;">Occupied: {{ stats.occupied }}</span>
                </small>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center">
              <div class="card-body">
                <h5 class="card-title">Registered Users</h5>
                <p class="card-text display-6">{{ stats.total_users }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">Parking Lot Occupancy</div>
              <div class="card-body">
                <canvas id="lotBarChart" style="max-width:100%;height:200px;"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">Revenue Distribution</div>
              <div class="card-body">
                <canvas id="revenuePieChart" style="max-width:100%;height:200px;"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
});