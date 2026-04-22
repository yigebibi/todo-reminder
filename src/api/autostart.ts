import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { emit } from '@tauri-apps/api/event';

export async function getAutostartEnabled(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function setAutostartEnabled(next: boolean): Promise<void> {
  if (next) {
    await enable();
  } else {
    await disable();
  }
  // Keep the tray menu's check item in sync with whatever the user just chose here.
  await emit('autostart-changed', next);
}
