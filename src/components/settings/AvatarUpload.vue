<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProfile } from '../../composables/useProfile';
import { CameraIcon, UserIcon } from '@heroicons/vue/24/outline';

const { profile, uploadAvatar } = useProfile();

const uploading = ref(false);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const initial = computed(() => {
  const name = profile.value?.display_name?.trim() ?? '';
  return name.length > 0 ? name[0].toUpperCase() : '?';
});

const triggerPicker = () => {
  if (!uploading.value) fileInput.value?.click();
};

const onFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  error.value = null;

  // 5 MB to match the bucket limit configured in the migration.
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Bild zu groß (max. 5 MB).';
    target.value = '';
    return;
  }
  if (!file.type.startsWith('image/')) {
    error.value = 'Bitte ein Bild auswählen.';
    target.value = '';
    return;
  }

  uploading.value = true;
  try {
    await uploadAvatar(file);
  } catch (e: any) {
    error.value = e?.message ?? 'Upload fehlgeschlagen.';
  } finally {
    uploading.value = false;
    target.value = '';
  }
};
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <button
      type="button"
      class="relative group rounded-full overflow-hidden ring-2 ring-base-300 hover:ring-primary transition-all"
      :class="uploading ? 'opacity-60' : ''"
      style="width: 96px; height: 96px"
      @click="triggerPicker"
      :disabled="uploading"
      aria-label="Profilbild ändern"
    >
      <img
        v-if="profile?.avatar_url"
        :src="profile.avatar_url"
        alt="Avatar"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center bg-base-200 text-base-content/60"
      >
        <span v-if="initial !== '?'" class="text-3xl font-bold">{{ initial }}</span>
        <UserIcon v-else class="h-12 w-12" />
      </div>

      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span v-if="uploading" class="loading loading-spinner loading-md text-white" />
        <CameraIcon v-else class="h-7 w-7 text-white" />
      </div>
    </button>

    <button
      type="button"
      class="text-xs link link-primary"
      @click="triggerPicker"
      :disabled="uploading"
    >
      {{ profile?.avatar_url ? 'Bild ändern' : 'Bild hochladen' }}
    </button>

    <p v-if="error" class="text-xs text-error">{{ error }}</p>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
