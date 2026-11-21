Vue.component('admin-navbar', {
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">Admin Panel</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNavbar" aria-controls="adminNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="adminNavbar">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/admin_dashboard">Dashboard</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin_manage_parking">Manage Parking</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin_customers">All Customers</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin_history">Booking History</router-link>
            </li>
          </ul>
          <button class="btn btn-outline-light" @click="logout">Logout</button>
        </div>
      </div>
    </nav>
  `,
  methods: {
    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      this.$router.push('/');
    }
  }
});


Vue.component('user-navbar', {
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">User Panel</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#userNavbar" aria-controls="userNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="userNavbar">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/user_dashboard">Dashboard</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/user_slot_booking">Book Slot</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/user_booking_status">Booking Status</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/user_history">My History</router-link>
            </li>
          </ul>
          <button class="btn btn-outline-light" @click="logout">Logout</button>
        </div>
      </div>
    </nav>
  `,
  methods: {
    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      this.$router.push('/');
    }
  }
});