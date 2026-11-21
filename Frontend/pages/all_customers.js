Vue.component('all_customers', {
  data() {
    return {
      customers: [],
      search: '',
      loading: false,
      error: '',
      selectedCustomer: null,
      showModal: false
    };
  },
  created() {
    this.fetchCustomers();
  },
  computed: {
    filteredCustomers() {
      if (!this.search) return this.customers;
      const s = this.search.toLowerCase();
      return this.customers.filter(c =>
        (c.username && c.username.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.phone_number && c.phone_number.toLowerCase().includes(s))
      );
    }
  },
  methods: {
    async fetchCustomers() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('/api/admin/customers');
        if (!res.ok) throw new Error('Failed to fetch customers');
        this.customers = await res.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    viewCustomer(customer) {
      this.selectedCustomer = customer;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedCustomer = null;
    }
  },
  template: `
    <div>
      <admin-navbar></admin-navbar>
      <div class="container mt-4">
        <h3>All Customers</h3>
        <input type="text" v-model="search" placeholder="Search by name, email, or phone..." class="form-control mb-3" />
        <div v-if="loading">Loading...</div>
        <div v-if="error" style="color:red;">{{ error }}</div>
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredCustomers" :key="c.id">
              <td>{{ c.username }}</td>
              <td>{{ c.email }}</td>
              <td>{{ c.phone_number }}</td>
              <td>{{ c.created_at ? c.created_at.split('T')[0] : '-' }}</td>
              <td>
                <button class="btn btn-info btn-sm" @click="viewCustomer(c)">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Customer Details Modal -->
      <div v-if="showModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:#fff;padding:20px;min-width:320px;">
          <h4>Customer Details</h4>
          <div v-if="selectedCustomer">
            <p><strong>Name:</strong> {{ selectedCustomer.username }}</p>
            <p><strong>Email:</strong> {{ selectedCustomer.email }}</p>
            <p><strong>Phone:</strong> {{ selectedCustomer.phone_number }}</p>
            <p><strong>Address:</strong> {{ selectedCustomer.Address || '-' }}</p>
            <p><strong>City:</strong> {{ selectedCustomer.city || '-' }}</p>
            <p><strong>State:</strong> {{ selectedCustomer.state || '-' }}</p>
            <p><strong>Country:</strong> {{ selectedCustomer.country || '-' }}</p>
            <p><strong>Pincode:</strong> {{ selectedCustomer.pin_code || '-' }}</p>
            <p><strong>Registration Date:</strong> {{ selectedCustomer.created_at ? selectedCustomer.created_at.split('T')[0] : '-' }}</p>
          </div>
          <div style="margin-top:10px;text-align:right;">
            <button class="btn btn-secondary" @click="closeModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `
});