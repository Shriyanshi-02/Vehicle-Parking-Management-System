Vue.component('login', {
  template: `
    <div class="login-container">
      <div class="row justify-content-center align-items-center min-vh-100">
        <div class="col-md-6 col-lg-5">
          <div class="login-card shadow p-4 rounded">
            <h2 class="mb-4 text-center text-primary">Login</h2>
            <form @submit.prevent="login" novalidate>
              <div class="mb-3">
                <label for="email" class="form-label fw-semibold">Email</label>
                <input id="email" type="email" class="form-control custom-input" v-model="form.email" required placeholder="Enter your email">
              </div>
              <div class="mb-4">
                <label for="password" class="form-label fw-semibold">Password</label>
                <input id="password" type="password" class="form-control custom-input" v-model="form.password" required placeholder="Enter your password">
              </div>
              <button type="submit" class="btn btn-primary w-100 btn-lg mb-3">Login</button>
              <router-link to="/register" class="btn btn-outline-primary w-100">Register</router-link>
            </form>
            <div class="mt-3 text-center" v-if="message">
              <span :class="{'text-success': success, 'text-danger': !success}">
                {{ message }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        email: '',
        password: ''
      },
      message: '',
      success: false
    }
  },
  methods: {
    async login() {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(this.form)
      });
      const data = await res.json();
      console.log('Login response:', res.status, data);
      this.message = data.message;
      this.success = res.status === 200;
      if (this.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_role', data.role);
        if (data.role === 'admin') {
          this.$router.push('/admin_dashboard');
        } else {
          this.$router.push('/user_dashboard');
        }
      }
    }
  }
});
