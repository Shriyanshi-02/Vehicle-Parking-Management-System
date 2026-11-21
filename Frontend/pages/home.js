Vue.component('home', {
  template: `
    <div class="welcome-bg">
      <div class="container d-flex align-items-center justify-content-center flex-column min-vh-100">
        <div class="welcome-card p-4 mb-4 shadow-lg text-center">
          <img src="https://img.icons8.com/color/144/000000/car--v2.png" alt="Vehicle" class="vehicle-img mb-4">
          <h2 class="font-weight-bold gradient-text">Welcome to Vehicle Parking App</h2>
          <p class="lead" style="color:#2c3e50">A modern, easy, and reliable way to reserve and manage your parking!</p>
          <div class="mt-4">
            <router-link class="btn btn-primary btn-lg me-3 px-4" to="/register">
              <i class="bi bi-box-arrow-in-righ"></i> Register
            </router-link>
            <router-link class="btn btn-success btn-lg px-4" to="/login">
              <i class="bi bi-box-arrow-in-right"></i> Login
            </router-link>
          </div>
        </div>
      </div>
    </div>
  `
});
