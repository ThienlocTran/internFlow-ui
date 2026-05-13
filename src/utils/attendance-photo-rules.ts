import type { Shift } from "@/types/api";

export type PhotoSlot = {
  label: string;
  time: string;
  description: string;
};

function toMinutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function toTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getPersonalIntervalSlots(shift: Shift): PhotoSlot[] {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const slots: PhotoSlot[] = [];

  for (let cursor = start + 30; cursor < end; cursor += 30) {
    slots.push({
      label: "Ảnh cá nhân giữa giờ",
      time: toTime(cursor),
      description: "Ảnh TimeMark giữa ca, không tính ảnh vào ca và tan ca.",
    });
  }

  return slots;
}

export function getGroupPhotoSlots(shift: Shift): PhotoSlot[] {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const slots: PhotoSlot[] = [
    {
      label: "Ảnh nhóm vào ca",
      time: toTime(start),
      description: "Một bạn đại diện giơ 2 ngón tay chào, các bạn còn lại không cần làm động tác.",
    },
  ];

  for (let cursor = start + 60; cursor < end; cursor += 60) {
    slots.push({
      label: "Ảnh nhóm giữa ca",
      time: toTime(cursor),
      description: "Cứ đúng 1 tiếng tính từ lúc vào làm sẽ có 1 ảnh nhóm.",
    });
  }

  slots.push({
    label: "Ảnh nhóm tan ca",
    time: toTime(end),
    description: "Một bạn đại diện giơ tay cao làm động tác tạm biệt, các bạn còn lại không cần làm.",
  });

  return slots;
}
