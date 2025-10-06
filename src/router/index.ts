import Absensi from "@/Absensi.vue";
import Home from "@/Home.vue";
import Login from "@/Login.vue";
import { useCookies } from "@vueuse/integrations/useCookies";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: Home,
      meta: { requireAuth: true },
    },
    {
      path: "/absensi",
      component: Absensi,
      meta: { requireAuth: true },
    },
    {
      path: "/login",
      component: Login,
    },
  ],
});

router.beforeEach((to, from) => {
  const cookies = useCookies();
  const isLoggedIn = cookies.get("auth");

  if (to.meta.requireAuth && !isLoggedIn) {
    return "/login";
  } else if (to.path === "/login" && isLoggedIn) {
    return "/";
  } else {
    return true;
  }
});

export default router;
