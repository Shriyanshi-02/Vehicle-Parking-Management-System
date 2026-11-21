Vue.component('register', {
  template: `
    <div class="register-container">
      <div class="row justify-content-center align-items-center min-vh-100">
        <div class="col-md-6 col-lg-5">
          <div class="register-card shadow p-4 rounded">
            <h2 class="mb-4 text-center gradient-text">Register</h2>
            <form @submit.prevent="register" novalidate enctype="multipart/form-data" autocomplete="off">
              <div class="mb-3">
                <label for="email" class="form-label fw-semibold">Email</label>
                <input id="email" type="email" class="form-control custom-input" v-model="form.email" required placeholder="Enter your email">
              </div>
              <div class="mb-3">
                <label for="password" class="form-label fw-semibold">Password</label>
                <input id="password" type="password" class="form-control custom-input" v-model="form.password" required placeholder="Choose a password">
              </div>
              <div class="mb-3">
                <label for="username" class="form-label fw-semibold">Username</label>
                <input id="username" type="text" class="form-control custom-input" v-model="form.username" required placeholder="Enter username">
              </div>
              <div class="mb-3">
                <label for="phone" class="form-label fw-semibold">Phone Number</label>
                <input id="phone" type="text" class="form-control custom-input" v-model="form.phone_number" required placeholder="Phone number">
              </div>
              <div class="mb-3">
                <label for="country" class="form-label fw-semibold">Country</label>
                <input id="country" type="text" class="form-control custom-input" v-model="form.country" required placeholder="Country">
              </div>
              <div class="mb-3">
                <label for="state" class="form-label fw-semibold">State</label>
                <input id="state" type="text" class="form-control custom-input" v-model="form.state" required placeholder="State">
              </div>
              <div class="mb-3">
                <label for="city" class="form-label fw-semibold">City</label>
                <input id="city" type="text" class="form-control custom-input" v-model="form.city" required placeholder="City">
              </div>
              <div class="mb-3">
                <label for="address" class="form-label fw-semibold">Address</label>
                <input id="address" type="text" class="form-control custom-input" v-model="form.address" required placeholder="Address">
              </div>
              <div class="mb-3">
                <label for="pincode" class="form-label fw-semibold">Pincode</label>
                <input id="pincode" type="number" class="form-control custom-input" v-model="form.pin_code" required placeholder="Pincode">
              </div>
              <div class="mb-4">
                <label for="profile" class="form-label fw-semibold">Profile Photo (optional)</label>
                <input id="profile" type="file" class="form-control" @change="onFileChange" accept="image/*">
                <img v-if="form.user_profile" :src="form.user_profile" alt="Preview" class="profile-preview mt-3" />
              </div>
              <button type="submit" class="btn btn-primary w-100 btn-lg">Register</button>
              <router-link to="/login" class="btn btn-link d-block text-center mt-3">Already have an account? Login</router-link>
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
        password: '',
        username: '',
        phone_number: '',
        country: '',
        state: '',
        city: '',
        address: '',
        pin_code: '',
        user_profile: ''
      },
      message: '',
      success: false
    };
  },
  methods: {
    onFileChange(e) {
      const file = e.target.files[0];
      if (!file) {
        this.form.user_profile = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        this.form.user_profile = event.target.result;
      };
      reader.readAsDataURL(file);
    },
    async register() {
      if (this.form.pin_code !== '') {
        this.form.pin_code = parseInt(this.form.pin_code, 10);
      }
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(this.form)
      });
      const data = await res.json();
      this.message = data.message;
      this.success = res.ok;
      if (this.success) {
        this.form = {
          email: '', password: '', username: '', phone_number: '', country: '', state: '', city: '', address: '', pin_code: '', user_profile: ''
        };
        this.$router.push('/login');
      }
    }
  }
});
