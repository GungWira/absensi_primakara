<script setup lang="ts">
import axios from "axios";
import { onMounted, ref } from "vue";
import { getDistance } from "./libs/getDistance";
import JSEncrypt from "jsencrypt";
import { useCookies } from "@vueuse/integrations/useCookies.mjs";
import { Head, useHead } from "@vueuse/head";

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isNotification = ref<boolean>(false);
const campustLatitude = ref<number>(-8.68956618854736);
const campusLongtitude = ref<number>(115.23798081887583);
const allowedDistance = ref<number>(25); // meter

const notificationTitile = ref<HTMLHeadingElement | null>(null);
const notificationImage = ref<HTMLImageElement | null>(null);
const notificationParagrafName = ref<HTMLParagraphElement | null>(null);
const notificationParagrafStatus = ref<HTMLParagraphElement | null>(null);
const notificationBackButton = ref<HTMLLinkElement | null>(null);
const notificationRetryButton = ref<HTMLLinkElement | null>(null);
const notificationStatus = ref<boolean>(false);

enum NotificationOptions {
  "location_not_valid",
  "success",
  "fail",
}

interface CheckLocation {
  status: boolean;
  data: {
    latitude: number;
    longtitude: number;
  };
}

onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
      },
      audio: false,
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
      const isAllowedLocation = (await checkLocation()) as CheckLocation;
      if (isAllowedLocation.status) {
        captureImage(
          isAllowedLocation.data.latitude,
          isAllowedLocation.data.longtitude
        );
      } else {
        setAlert(NotificationOptions.location_not_valid, null);
      }
    }
  } catch (err) {
    console.error("Gagal membuka kamera:", err);
  }
});

async function checkLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Lokasi tidak diaktifkan"));
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const userLatitude = position.coords.latitude;
      const userLongtitude = position.coords.longitude;

      if (userLatitude && userLongtitude) {
        const distance = getDistance(
          userLatitude,
          userLongtitude,
          campustLatitude.value,
          campusLongtitude.value
        );
        if (distance <= allowedDistance.value) {
          resolve({
            status: true,
            data: {
              latitude: userLatitude,
              longtitude: userLongtitude,
            },
          });
        } else {
          resolve({
            status: false,
            data: { latitude: null, longtitude: null },
          });
        }
      }
    });
  });
}

async function captureImage(latitude: number, longitude: number) {
  if (!videoRef.value || !canvasRef.value) return;

  const video = videoRef.value;
  const canvas = canvasRef.value;

  // set ukuran canvas agar lebih kecil
  canvas.width = 480;
  canvas.height = 320;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // gambar frame dari video ke canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // convert canvas jadi base64
  let base64Img = canvas.toDataURL("image/jpeg", 0.8);
  if (base64Img.startsWith("data:")) {
    base64Img = base64Img.split(",")[1]!;
  }

  // persiapkan sistem enkripsi
  const encrypt = new JSEncrypt();
  let publicKey = atob(import.meta.env.VITE_PUBLIC_KEY_B64);
  encrypt.setPublicKey(publicKey);

  // persiapkan data lokasi sebagai key
  const location = JSON.stringify({
    latitude: latitude,
    longitude: longitude,
  });

  const encryptedLocation = encrypt.encrypt(location);
  if (!encryptedLocation) throw new Error("Encrypt gagal");

  // ambil data token cookies dari user
  const cookies = useCookies();
  const token = cookies.get("auth");

  axios
    .post(
      import.meta.env.VITE_PUBLIC_API_URL + "/fo/scan",
      {
        latitude,
        longitude,
        location: encryptedLocation,
        base64_image: base64Img,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    .then((response) => {
      if (response.status == 200) {
        setAlert(
          NotificationOptions.success,
          response.data.data.user.nama_lengkap
        );
      }
    })
    .catch((error) => {
      setAlert(NotificationOptions.fail, null);
    });
}

async function checkAndCapture() {
  const isAllowedLocation = (await checkLocation()) as CheckLocation;
  if (isAllowedLocation.status) {
    captureImage(
      isAllowedLocation.data.latitude,
      isAllowedLocation.data.longtitude
    );
  } else {
    setAlert(NotificationOptions.location_not_valid, null);
  }
}

function setAlert(status: NotificationOptions, name: null | string) {
  if (status == NotificationOptions.location_not_valid) {
    notificationTitile.value!.innerHTML = "LOKASI TIDAK VALID";
    notificationParagrafStatus.value!.innerHTML =
      "Lokasi absensi tidak valid. Mohon pergi ke tempat yang diizinkan atau coba lagi dalam beberapa saat";
    notificationImage.value!.src = "/assets/Fail.svg";
    notificationStatus.value = false;
  } else if (status == NotificationOptions.success) {
    notificationTitile.value!.innerHTML = "ABSENSI BERHASIL";
    notificationParagrafName.value!.innerHTML = name!;
    notificationImage.value!.src = "/assets/Success.svg";
    notificationStatus.value = true;
  } else {
    notificationTitile.value!.innerHTML = "GAGAL TERDETEKSI";
    notificationParagrafStatus.value!.innerHTML =
      "<b>Absensi gagal</b> dilakukan, mohon posisikan wajah tepat ditengah layar dan coba kembali pada kondisi cahaya yang lebih baik";
    notificationImage.value!.src = "/assets/Fail.svg";
    notificationStatus.value = false;
  }
  isNotification.value = true;
}
</script>

<template>
  <Head title="Absensi"><title>Absensi</title></Head>
  <div
    class="relative flex h-screen w-full flex-col sm:flex-row items-center justify-center overflow-hidden"
  >
    <!-- CAMERA AREA -->
    <div
      class="relative flex h-full w-full items-center justify-center bg-black"
    >
      <video
        ref="videoRef"
        autoplay
        playsinline
        class="h-full w-full scale-x-[-1] transform object-cover"
      ></video>
      <!-- CANVAS CAPTURE -->
      <canvas ref="canvasRef" class="hidden"></canvas>
      <!-- BUTTON CAPTURE -->
      <button
        class="absolute sm:bottom-auto bottom-6 sm:right-10 aspect-square cursor-pointer rounded-full border-3 border-[#032038] bg-white p-5"
        @click="checkAndCapture"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-camera-fill sm:h-10 sm:w-10 h-8 w-8 text-[#032038]"
          viewBox="0 0 16 16"
        >
          <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
          <path
            d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1m9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0"
          />
        </svg>
      </button>
    </div>
    <!-- SIDEBAR -->
    <div
      class="bg-darkblue flex h-fit sm:h-full w-full sm:w-[25vw] sm:max-w-80 flex-row sm:flex-col items-center justify-start gap-10 px-2 py-8"
    >
      <div href="https://primakara.ac.id" class="w-3/4 hidden sm:flex">
        <img
          src="/assets/logo-primakara-white.png"
          alt="logo primakara university"
        />
      </div>
      <div
        class="flex h-full w-full flex-row sm:flex-col items-start justify-start gap-2"
      >
        <a
          href="/"
          class="flex w-full flex-col items-center justify-center gap-2 sm:gap-4 py-5 sm:py-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-house-door-fill h-6 w-6 sm:h-8 sm:w-8 text-white"
            viewBox="0 0 16 16"
          >
            <path
              d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"
            />
          </svg>
          <p class="text-base text-white">Beranda</p>
        </a>
        <a
          href="/absensi"
          class="flex active-link w-full flex-col items-center justify-center gap-2 sm:gap-4 py-5 sm:py-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-fingerprint h-6 w-6 sm:h-8 sm:w-8 text-white"
            viewBox="0 0 16 16"
          >
            <path
              d="M8.06 6.5a.5.5 0 0 1 .5.5v.776a11.5 11.5 0 0 1-.552 3.519l-1.331 4.14a.5.5 0 0 1-.952-.305l1.33-4.141a10.5 10.5 0 0 0 .504-3.213V7a.5.5 0 0 1 .5-.5Z"
            />
            <path
              d="M6.06 7a2 2 0 1 1 4 0 .5.5 0 1 1-1 0 1 1 0 1 0-2 0v.332q0 .613-.066 1.221A.5.5 0 0 1 6 8.447q.06-.555.06-1.115zm3.509 1a.5.5 0 0 1 .487.513 11.5 11.5 0 0 1-.587 3.339l-1.266 3.8a.5.5 0 0 1-.949-.317l1.267-3.8a10.5 10.5 0 0 0 .535-3.048A.5.5 0 0 1 9.569 8m-3.356 2.115a.5.5 0 0 1 .33.626L5.24 14.939a.5.5 0 1 1-.955-.296l1.303-4.199a.5.5 0 0 1 .625-.329"
            />
            <path
              d="M4.759 5.833A3.501 3.501 0 0 1 11.559 7a.5.5 0 0 1-1 0 2.5 2.5 0 0 0-4.857-.833.5.5 0 1 1-.943-.334m.3 1.67a.5.5 0 0 1 .449.546 10.7 10.7 0 0 1-.4 2.031l-1.222 4.072a.5.5 0 1 1-.958-.287L4.15 9.793a9.7 9.7 0 0 0 .363-1.842.5.5 0 0 1 .546-.449Zm6 .647a.5.5 0 0 1 .5.5c0 1.28-.213 2.552-.632 3.762l-1.09 3.145a.5.5 0 0 1-.944-.327l1.089-3.145c.382-1.105.578-2.266.578-3.435a.5.5 0 0 1 .5-.5Z"
            />
            <path
              d="M3.902 4.222a5 5 0 0 1 5.202-2.113.5.5 0 0 1-.208.979 4 4 0 0 0-4.163 1.69.5.5 0 0 1-.831-.556m6.72-.955a.5.5 0 0 1 .705-.052A4.99 4.99 0 0 1 13.059 7v1.5a.5.5 0 1 1-1 0V7a3.99 3.99 0 0 0-1.386-3.028.5.5 0 0 1-.051-.705M3.68 5.842a.5.5 0 0 1 .422.568q-.044.289-.044.59c0 .71-.1 1.417-.298 2.1l-1.14 3.923a.5.5 0 1 1-.96-.279L2.8 8.821A6.5 6.5 0 0 0 3.058 7q0-.375.054-.736a.5.5 0 0 1 .568-.422m8.882 3.66a.5.5 0 0 1 .456.54c-.084 1-.298 1.986-.64 2.934l-.744 2.068a.5.5 0 0 1-.941-.338l.745-2.07a10.5 10.5 0 0 0 .584-2.678.5.5 0 0 1 .54-.456"
            />
            <path
              d="M4.81 1.37A6.5 6.5 0 0 1 14.56 7a.5.5 0 1 1-1 0 5.5 5.5 0 0 0-8.25-4.765.5.5 0 0 1-.5-.865m-.89 1.257a.5.5 0 0 1 .04.706A5.48 5.48 0 0 0 2.56 7a.5.5 0 0 1-1 0c0-1.664.626-3.184 1.655-4.333a.5.5 0 0 1 .706-.04ZM1.915 8.02a.5.5 0 0 1 .346.616l-.779 2.767a.5.5 0 1 1-.962-.27l.778-2.767a.5.5 0 0 1 .617-.346m12.15.481a.5.5 0 0 1 .49.51c-.03 1.499-.161 3.025-.727 4.533l-.07.187a.5.5 0 0 1-.936-.351l.07-.187c.506-1.35.634-2.74.663-4.202a.5.5 0 0 1 .51-.49"
            />
          </svg>
          <p class="text-base text-white">Absensi</p>
        </a>
        <a
          href="/"
          class="flex w-full flex-col items-center justify-center gap-2 sm:gap-4 py-5 sm:py-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-calendar-check-fill h-6 w-6 sm:h-8 sm:w-8 text-white"
            viewBox="0 0 16 16"
          >
            <path
              d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4zM16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2m-5.146-5.146-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708.708"
            />
          </svg>
          <p class="text-base text-white">Agenda & Event</p>
        </a>
      </div>
    </div>
    <!-- ALERT TOP -->
    <div
      class="absolute top-8 left-4 mr-4 flex flex-col items-start justify-start gap-1 rounded-lg border border-[#1dcad3] bg-white sm:p-6 p-5"
    >
      <h2 class="text-xl font-bold text-[#1dcad3]">
        Selamat
        {{
          new Date().getHours() >= 4 && new Date().getHours() <= 9
            ? "Pagi"
            : new Date().getHours() >= 10 && new Date().getHours() <= 14
            ? "Siang"
            : new Date().getHours() >= 15 && new Date().getHours() <= 18
            ? "Sore"
            : "Malam"
        }}
      </h2>
      <p class="text-base text-black opacity-70">
        Pastikan wajah kamu terlihat jelas pada layar dan tekan capture!
      </p>
    </div>
  </div>

  <!-- NOTIFICATION -->
  <div
    class="absolute px-6 top-0 left-0 z-50 flex h-screen w-screen overflow-hidden items-center justify-center bg-black/80"
    v-show="isNotification"
  >
    <!-- CARD -->
    <div
      class="flex w-full max-w-lg flex-col max-h-[90%] items-center justify-center gap-5 rounded-xl bg-white p-6 py-10"
    >
      <!-- HEAD -->
      <h2
        ref="notificationTitile"
        class="text-3xl font-bold text-black opacity-80"
      >
        ABSENSI BERHASIL
      </h2>
      <!-- IMAGE -->
      <div class="flex w-full items-center justify-center overflow-hidden">
        <img
          ref="notificationImage"
          src="/assets/Success.svg"
          alt="image illustration primakara university absensi"
          class="w-full max-w-sm object-cover"
        />
      </div>
      <!-- DETAIL -->
      <div class="flex w-full flex-col items-start justify-start gap-3">
        <!-- NAMA -->
        <div
          class="flex w-full flex-row items-start justify-start gap-3"
          v-show="notificationStatus"
        >
          <p class="text-xl font-bold text-black opacity-80 whitespace-nowrap">
            Nama :
          </p>
          <p
            ref="notificationParagrafName"
            class="text-xl text-black opacity-80"
          ></p>
        </div>
        <!-- WAKTU -->
        <div
          class="flex w-full flex-row items-start justify-start gap-3"
          v-show="notificationStatus"
        >
          <p class="text-xl font-bold text-black opacity-80 whitespace-nowrap">
            Waktu :
          </p>
          <p class="text-xl text-black opacity-80">
            {{
              new Date().getHours() +
              "." +
              (new Date().getMinutes() < 10
                ? "0" + new Date().getMinutes()
                : new Date().getMinutes())
            }}
            WITA
          </p>
        </div>
        <!-- STATUS -->
        <div
          class="flex w-full flex-row items-start justify-start gap-3"
          v-show="!notificationStatus"
        >
          <p
            ref="notificationParagrafStatus"
            class="text-lg text-black opacity-80"
          ></p>
        </div>
      </div>
      <!-- ACTION -->
      <div class="flex w-full flex-col items-start justify-start gap-3">
        <button
          ref="notificationRetryButton"
          class="bg-darkblue cursor-pointer w-full rounded-md px-8 py-4 text-center text-xl font-bold text-white"
          @click="isNotification = false"
        >
          Coba Lagi
        </button>
        <button
          ref="notificationBackButton"
          class="bg-transparent text-darkblue w-full cursor-pointer rounded-md px-8 py-4 text-center text-xl font-bold border border-[#032038]"
          @click="$router.push('/')"
        >
          Kembali
        </button>
      </div>
    </div>
  </div>
</template>
