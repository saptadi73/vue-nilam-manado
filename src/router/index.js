import { createRouter, createWebHistory } from 'vue-router'
import { hasAccessToken } from '@/services/authSession'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/petani', name: 'petani', component: () => import('@/views/FarmerPerformanceView.vue') },
    { path: '/real/login', name: 'real-login', component: () => import('@/views/RealLoginView.vue') },
    { path: '/real/petani', name: 'petani-real', component: () => import('@/views/FarmerListRealView.vue'), meta: { requiresAuth: true } },
    {
      path: '/real/petani/new',
      name: 'petani-real-create',
      component: () => import('@/views/FarmerFormRealView.vue'),
      props: { mode: 'create' },
      meta: { requiresAuth: true },
    },
    {
      path: '/real/petani/:id',
      name: 'petani-real-detail',
      component: () => import('@/views/FarmerFormRealView.vue'),
      props: (route) => ({ mode: 'detail', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    {
      path: '/real/petani/:id/edit',
      name: 'petani-real-edit',
      component: () => import('@/views/FarmerFormRealView.vue'),
      props: (route) => ({ mode: 'edit', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    { path: '/real/wilayah', name: 'wilayah-real', component: () => import('@/views/RegionMasterRealView.vue'), meta: { requiresAuth: true } },
    { path: '/real/profile', name: 'real-profile', component: () => import('@/views/RealProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/real/lahan', name: 'lahan-real-list', component: () => import('@/views/LandListRealView.vue'), meta: { requiresAuth: true } },
    {
      path: '/real/lahan/new',
      name: 'lahan-real-create',
      component: () => import('@/views/LandFormRealView.vue'),
      props: { mode: 'create' },
      meta: { requiresAuth: true },
    },
    {
      path: '/real/lahan/:id',
      name: 'lahan-real-detail',
      component: () => import('@/views/LandFormRealView.vue'),
      props: (route) => ({ mode: 'detail', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    {
      path: '/real/lahan/:id/edit',
      name: 'lahan-real-edit',
      component: () => import('@/views/LandFormRealView.vue'),
      props: (route) => ({ mode: 'edit', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    { path: '/real/produksi-tanam/new', name: 'planting-production-real-create', component: () => import('@/views/PlantingProductionFormRealView.vue'), meta: { requiresAuth: true } },
    { path: '/real/produksi-tanam', name: 'planting-production-real-list', component: () => import('@/views/PlantingProductionListRealView.vue'), meta: { requiresAuth: true } },
    {
      path: '/real/produksi-tanam/:id',
      name: 'planting-production-real-detail',
      component: () => import('@/views/PlantingProductionFormRealView.vue'),
      props: (route) => ({ mode: 'detail', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    {
      path: '/real/produksi-tanam/:id/edit',
      name: 'planting-production-real-edit',
      component: () => import('@/views/PlantingProductionFormRealView.vue'),
      props: (route) => ({ mode: 'edit', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    { path: '/real/produksi-minyak/new', name: 'oil-production-real-create', component: () => import('@/views/OilProductionFormRealView.vue'), meta: { requiresAuth: true } },
    { path: '/real/produksi-minyak', name: 'oil-production-real-list', component: () => import('@/views/OilProductionListRealView.vue'), meta: { requiresAuth: true } },
    {
      path: '/real/produksi-minyak/:id',
      name: 'oil-production-real-detail',
      component: () => import('@/views/OilProductionFormRealView.vue'),
      props: (route) => ({ mode: 'detail', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    {
      path: '/real/produksi-minyak/:id/edit',
      name: 'oil-production-real-edit',
      component: () => import('@/views/OilProductionFormRealView.vue'),
      props: (route) => ({ mode: 'edit', id: route.params.id }),
      meta: { requiresAuth: true },
    },
    { path: '/produksi', name: 'produksi', component: () => import('@/views/ProductionReportView.vue') },
    { path: '/penjualan', name: 'penjualan', component: () => import('@/views/SalesReportView.vue') },
    { path: '/operasional', name: 'operasional', component: () => import('@/views/OperationalView.vue') },
    { path: '/traceability/:lotId?', name: 'traceability', component: () => import('@/views/TraceabilityView.vue') },
    { path: '/inventory', name: 'inventory', component: () => import('@/views/InventoryReportView.vue') },
    { path: '/kualitas', name: 'kualitas', component: () => import('@/views/QualityReportView.vue') },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !hasAccessToken()) {
    return {
      name: 'real-login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'real-login' && hasAccessToken()) {
    return { name: 'petani-real' }
  }

  return true
})

export default router
