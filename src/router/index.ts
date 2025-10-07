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
    {
      path: "/logout",
      name: "logout",
      component: {
        beforeRouteEnter(to, from, next) {
          document.cookie.split(";").forEach(function (c) {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(
                /=.*/,
                "=;expires=" + new Date(0).toUTCString() + ";path=/"
              );
          });

          next("/");
        },
        render() {
          return null;
        },
      },
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
