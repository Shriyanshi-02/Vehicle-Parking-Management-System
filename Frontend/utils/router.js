const routes = [
  { path: '/', component: Vue.component('home') },
  { path: '/login', component: Vue.component('login') },
  { path: '/register', component: Vue.component('register') },
  { path: '/admin_dashboard', component: Vue.component('admin_dashboard') },
  { path: '/admin_manage_parking', component: Vue.component('admin_manage_parking') },
  { path: '/admin_customers', component: Vue.component('all_customers') },
  { path: '/admin_history', component: Vue.component('admin_history') },      // <-- Admin history
  { path: '/user_dashboard', component: Vue.component('user_dashboard') },
  { path: '/user_slot_booking', component: Vue.component('user_slot_booking') },
  { path: '/user_booking_status', component: Vue.component('user_booking_status') },
  { path: '/user_history', component: Vue.component('user_history') },        // <-- User history
  // ...other routes...
];
const router = new VueRouter({ routes });
window.router = router;