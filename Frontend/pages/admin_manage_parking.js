Vue.component('admin_manage_parking', {
  data() {
    return {
      lots: [],
      spots: [],
      showLotModal: false,
      showSpotsModal: false,
      editingLot: null,
      lotForm: {
        location_name: '',
        address: '',
        price: 0,
        number_of_spots: 0,
        city: '',
        state: '',
        country: '',
        pin_code: ''
      },
      selectedLot: null,
      loading: false,
      error: '',
      success: '',
      search: ''
    };
  },
  created() {
    this.fetchLots();
    this.startSpotStatusWatcher();
  },
  beforeDestroy() {
    clearInterval(this.statusWatcherInterval);
  },
  computed: {
    filteredLots() {
      if (!this.search) return this.lots;
      const s = this.search.toLowerCase();
      return this.lots.filter(lot =>
        lot.location_name.toLowerCase().includes(s) ||
        lot.address.toLowerCase().includes(s) ||
        lot.city.toLowerCase().includes(s) ||
        lot.state.toLowerCase().includes(s) ||
        lot.country.toLowerCase().includes(s) ||
        String(lot.price).includes(s)
      );
    }
  },
  methods: {
    async fetchLots() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('/api/parking_lots');
        if (!res.ok) throw new Error('Failed to fetch parking lots');
        this.lots = await res.json();
      } catch (e) {
        this.error = e.message;
        alert('Error: ' + e.message);
      } finally {
        this.loading = false;
      }
    },
    async fetchSpots(lot) {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch(`/api/parking_lots/${lot.id}/spots`);
        if (!res.ok) throw new Error('Failed to fetch spots');
        this.spots = await res.json();
        this.selectedLot = lot;
        this.showSpotsModal = true;
      } catch (e) {
        this.error = e.message;
        alert('Error: ' + e.message);
      } finally {
        this.loading = false;
      }
    },
    openAddLot() {
      this.editingLot = null;
      this.lotForm = {
        location_name: '',
        address: '',
        price: 0,
        number_of_spots: 0,
        city: '',
        state: '',
        country: '',
        pin_code: ''
      };
      this.showLotModal = true;
    },
    openEditLot(lot) {
      this.editingLot = lot;
      this.lotForm = { ...lot };
      this.showLotModal = true;
    },
    async saveLot() {
      try {
        let res;
        if (this.editingLot) {
          res = await fetch(`/api/parking_lots/${this.editingLot.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.lotForm)
          });
        } else {
          res = await fetch('/api/parking_lots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.lotForm)
          });
        }
        if (!res.ok) throw new Error('Failed to save parking lot');
        this.showLotModal = false;
        this.fetchLots();
        alert('Lot saved successfully!');
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    async deleteLot(lot) {
      if (!confirm('Are you sure you want to delete this lot?')) return;
      try {
        const res = await fetch(`/api/parking_lots/${lot.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete parking lot');
        this.fetchLots();
        alert('Lot deleted successfully!');
      } catch (e) {
        alert('Error: ' + e.message);
      }
    },
    availableSpots(lot) {
      return lot.spots ? lot.spots.filter(s => s.status === 'A').length : 0;
    },
    canDeleteLot(lot) {
      return this.availableSpots(lot) === lot.spots.length;
    },
    closeLotModal() {
      this.showLotModal = false;
    },
    closeSpotsModal() {
      this.showSpotsModal = false;
      this.selectedLot = null;
      this.spots = [];
    },
    // --- Spot Status Watcher ---
    startSpotStatusWatcher() {
      this.statusWatcherInterval = setInterval(this.checkAndUpdateSpotStatus, 30000);
      this.checkAndUpdateSpotStatus();
    },
    async checkAndUpdateSpotStatus() {
      try {
        const lotsRes = await fetch('/api/parking_lots');
        if (!lotsRes.ok) return;
        const lots = await lotsRes.json();
        const now = new Date();

        for (const lot of lots) {
          for (const spot of lot.spots) {
            if (spot.status === 'R') { // Reserved
              // Fetch spot details to get reservation times
              const spotsRes = await fetch(`/api/parking_lots/${lot.id}/spots`);
              if (!spotsRes.ok) continue;
              const spotsDetails = await spotsRes.json();
              const spotDetail = spotsDetails.find(s => s.id === spot.id);
              if (!spotDetail || !spotDetail.start_time || !spotDetail.end_time) continue;

              const start = new Date(spotDetail.start_time.replace(' ', 'T'));
              const end = new Date(spotDetail.end_time.replace(' ', 'T'));

              // If now is within reservation window, update status to occupied
              if (now >= start && now < end) {
                await fetch('/api/admin/update_spot_status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    spot_id: spot.id,
                    status: 'O'
                  })
                });
              }
            }
          }
        }
        // Optionally refresh lots after update
        this.fetchLots();
      } catch (e) {
        // Optionally log error
      }
    }
  },
  template: `
    <div>
      <admin-navbar></admin-navbar>
      <div class="container mt-4">
        <h3>Parking Lot Management</h3>
        <input type="text" v-model="search" placeholder="Search lots..." class="form-control mb-3" />
        <button class="btn btn-success mb-3" @click="openAddLot">Add New Lot</button>
        <div v-if="loading">Loading...</div>
        <div v-if="error" style="color:red;">{{ error }}</div>
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Lot Name</th>
              <th>Address</th>
              <th>City</th>
              <th>State</th>
              <th>Country</th>
              <th>Price</th>
              <th>Total Spots</th>
              <th>Available Spots</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lot in filteredLots" :key="lot.id">
              <td>{{ lot.location_name }}</td>
              <td>{{ lot.address }}</td>
              <td>{{ lot.city }}</td>
              <td>{{ lot.state }}</td>
              <td>{{ lot.country }}</td>
              <td>₹{{ lot.price }}</td>
              <td>{{ lot.number_of_spots }}</td>
              <td>{{ availableSpots(lot) }}</td>
              <td>
                <button class="btn btn-primary btn-sm" @click="fetchSpots(lot)">View Details</button>
                <button class="btn btn-warning btn-sm" @click="openEditLot(lot)">Edit</button>
                <button class="btn btn-danger btn-sm" @click="deleteLot(lot)" :disabled="!canDeleteLot(lot)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Lot Modal -->
      <div v-if="showLotModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:#fff;padding:20px;min-width:300px;">
          <h4>{{ editingLot ? 'Edit Lot' : 'Add New Lot' }}</h4>
          <form @submit.prevent="saveLot">
            <div>
              <label>Lot Name:</label>
              <input v-model="lotForm.location_name" required class="form-control">
            </div>
            <div>
              <label>Address:</label>
              <input v-model="lotForm.address" required class="form-control">
            </div>
            <div>
              <label>Price per Slot:</label>
              <input type="number" v-model.number="lotForm.price" required class="form-control">
            </div>
            <div>
              <label>Total Spots:</label>
              <input type="number" v-model.number="lotForm.number_of_spots" required class="form-control">
            </div>
            <div>
              <label>City:</label>
              <input v-model="lotForm.city" class="form-control">
            </div>
            <div>
              <label>State:</label>
              <input v-model="lotForm.state" class="form-control">
            </div>
            <div>
              <label>Country:</label>
              <input v-model="lotForm.country" class="form-control">
            </div>
            <div>
              <label>Pincode:</label>
              <input v-model="lotForm.pin_code" class="form-control">
            </div>
            <div style="margin-top:10px;">
              <button type="submit" class="btn btn-success">{{ editingLot ? 'Update' : 'Add' }}</button>
              <button type="button" class="btn btn-secondary" @click="closeLotModal">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Spots Modal -->
      <div v-if="showSpotsModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:#fff;padding:20px;min-width:600px;max-height:80vh;overflow-y:auto;">
          <h4>Spots for {{ selectedLot.location_name }}</h4>
          <table class="table table-bordered table-striped">
            <thead>
              <tr>
                <th>Spot Number</th>
                <th>Status</th>
                <th>User</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(spot) in spots" :key="spot.id">
                <td>{{ spot.spot_number }}</td>
                <td>
                  <span v-if="spot.status === 'A'" class="status-available">Available</span>
                  <span v-else-if="spot.status === 'O'" class="status-occupied">Occupied</span>
                  <span v-else-if="spot.status === 'R'" class="status-reserved">Reserved</span>
                  </td>
                <td>
                  <span v-if="spot.status !== 'A' && spot.user">{{ spot.user.username }}</span>
                  <span v-else>-</span>
                </td>
                <td>
                  <span v-if="spot.status !== 'A' && spot.start_time">{{ spot.start_time }}</span>
                  <span v-else>-</span>
                </td>
                <td>
                  <span v-if="spot.status !== 'A' && spot.end_time">{{ spot.end_time }}</span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:10px;text-align:right;">
            <button class="btn btn-secondary" @click="closeSpotsModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `
});
