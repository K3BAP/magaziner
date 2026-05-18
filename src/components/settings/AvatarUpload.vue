<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProfile } from '../../composables/useProfile';
import { CameraIcon, UserIcon } from '@heroicons/vue/24/outline';
import AvatarCropModal from './AvatarCropModal.vue';

const { profile, uploadAvatar } = useProfile();

type Phase = 'idle' | 'uploading';
const phase = ref<Phase>('idle');
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// The file currently being cropped. Setting this opens the modal.
const pendingFile = ref<File | null>(null);

const busy = computed(() => phase.value !== 'idle');

const initial = computed(() => {
  const name = profile.value?.display_name?.trim() ?? '';
  return name.length > 0 ? name[0].toUpperCase() : '?';
});

const triggerPicker = () => {
  if (!busy.value) fileInput.value?.click();
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  // Reset the input so re-picking the same file still re-triggers `change`.
  target.value = '';
  if (!file) return;

  error.value = null;

  if (!file.type.startsWith('image/')) {
    error.value = 'Bitte ein Bild auswählen.';
    return;
  }

  // Defer to the crop modal — user chooses the visible area, then we encode.
  pendingFile.value = file;
};

const onCropCancel = () => {
  pendingFile.value = null;
};

const onCropDone = async (cropped: File) => {
  pendingFile.value = null;
  phase.value = 'uploading';
  try {
    await uploadAvatar(cropped);
  } catch (e: any) {
    error.value = e?.message ?? 'Upload fehlgeschlagen.';
  } finally {
    phase.value = 'idle';
  }
};
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <button
      type="button"
      class="relative group rounded-full overflow-hidden ring-2 ring-base-300 hover:ring-primary transition-all"
      :class="busy ? 'opacity-60' : ''"
      style="width: 96px; height: 96px"
      @click="triggerPicker"
      :disabled="busy"
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

      <div
        class="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center"
        :class="busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
      >
        <span v-if="busy" class="loading loading-spinner loading-md text-white" />
        <CameraIcon v-else class="h-7 w-7 text-white" />
      </div>
    </button>

    <button
      type="button"
      class="text-xs link link-primary"
      @click="triggerPicker"
      :disabled="busy"
    >
      {{ profile?.avatar_url ? 'Bild ändern' : 'Bild hochladen' }}
    </button>

    <p v-if="busy" class="text-xs text-base-content/60">Wird hochgeladen…</p>
    <p v-else-if="error" class="text-xs text-error">{{ error }}</p>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />

    <AvatarCropModal
      :file="pendingFile"
      @cancel="onCropCancel"
      @cropped="onCropDone"
    />
  </div>
</template>
