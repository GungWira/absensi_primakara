<script setup lang="ts">
import { useCookies } from "@vueuse/integrations/useCookies.mjs";
import axios from "axios";
import { ref } from "vue";
import router from "./router";
import { Head } from "@vueuse/head";

const emailRef = ref<HTMLInputElement | null>(null);
const passwordRef = ref<HTMLInputElement | null>(null);
const isLoading = ref<boolean>(false);

function submitForm(event: any) {
  event.preventDefault();
  isLoading.value = true;

  if (emailRef.value && passwordRef.value) {
    const email = emailRef.value.value;
    const password = passwordRef.value.value;

    if (email && password) {
      axios
        .post(import.meta.env.VITE_PUBLIC_API_URL + "/login", {
          email: email,
          password: password,
        })
        .then((response) => {
          const tokenData = response.data.data.token;
          const cookies = useCookies();
          cookies.set("auth", tokenData, {
            secure: true,
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 30,
          });
          isLoading.value = false;
          router.push("/");
        })
        .catch((error) => {
          isLoading.value = false;
          console.error(error);
        });
    }
  }
}
</script>

<template>
  <Head>
    <title>Login</title>
  </Head>
  <div
    class="flex h-screen w-screen items-center justify-center bg-slate-50 px-6"
  >
    <div
      class="flex flex-col sm:flex-row w-full max-w-4xl items-stretch justify-start overflow-hidden rounded-lg shadow-lg"
    >
      <!-- IMAGE AREA -->
      <div class="relative w-full h-64 sm:h-auto sm:flex-1 overflow-hidden">
        <img
          src="/assets/login-img.png"
          alt="login img"
          class="h-full w-full object-cover"
        />
        <div
          class="absolute bottom-6 sm:bottom-8 flex w-fit flex-col gap-2 px-6 sm:px-8"
        >
          <div
            class="bg-lightblue w-fit rounded-md rounded-tl-2xl rounded-br-2xl py-2 ps-4 pe-5 text-lg font-semibold text-white italic"
          >
            Sistem Absensi
          </div>
          <p class="text-2xl font-bold text-white">Primakara University</p>
        </div>
      </div>
      <!-- FORM AREA -->
      <form
        action=""
        class="flex flex-1 flex-col gap-5 bg-white px-6 py-8 pb-10 sm:pb-16 sm:py-16"
      >
        <!-- HEAD -->
        <div class="flex w-full flex-col items-start justify-start gap-4">
          <img
            src="/assets/logo-primakara-color.png"
            alt="logo primakara university color"
            class="h-8 sm:h-10"
          />
          <p class="text-base text-black opacity-70">
            Silahkan login untuk mengakses absensi
          </p>
        </div>
        <!-- INPUT -->
        <div class="flex w-full flex-col items-start justify-start gap-4">
          <!-- EMAIL -->
          <div class="flex w-full flex-col items-start justify-start gap-3">
            <label for="email">Email</label>
            <input
              ref="emailRef"
              type="email"
              id="email"
              name="email"
              placeholder="Email"
              autocomplete="email"
              class="w-full rounded-md border border-slate-100 px-3 py-2 outline-0"
            />
          </div>
          <!-- PASSWORD -->
          <div class="flex w-full flex-col items-start justify-start gap-3">
            <label for="password">Password</label>
            <input
              ref="passwordRef"
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              autocomplete="current-password"
              class="w-full rounded-md border border-slate-100 px-3 py-2 outline-0"
            />
          </div>
        </div>
        <!-- FOOT -->
        <div class="mt-1 flex w-full flex-row justify-start gap-4">
          <button
            type="submit"
            @click="submitForm"
            :disabled="isLoading"
            class="bg-lightblue flex items-center justify-center gap-2 cursor-pointer rounded-md px-4 py-2 text-base font-bold text-white hover:bg-[#108f96] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <!-- Spinner -->
            <svg
              v-if="isLoading"
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>

            <!-- Text -->
            <span>{{ isLoading ? "Loading..." : "Login" }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
