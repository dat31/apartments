import { Streami18n, enTranslations } from "stream-chat-react";
import { type Locale } from "@/i18n/routing";

/* ============================================================
   Stream's own UI strings (composer placeholder, date separators,
   typing indicator, message actions…). App copy lives in
   messages/{vi,en}.json; only the SDK's built-in text belongs here.

   Streami18n keys are the English sentences themselves, and the
   instance is built with `fallbackLng: false` — an untranslated key
   renders as the key. That is harmless for plain sentences but not
   for the machine-ish ones ("timestamp/DateSeparator", plural
   suffixes), so the Vietnamese map is layered over the full English
   one rather than shipped alone.
   ============================================================ */

/* Dayjs has no Vietnamese locale loaded by default, and without one every
   calendar/relative format silently falls back to English. Registering the
   config here is what makes "Hôm nay" / "Thứ Ba" reach the date separators. */
const viDayjsLocale = {
  months:
    "tháng 1_tháng 2_tháng 3_tháng 4_tháng 5_tháng 6_tháng 7_tháng 8_tháng 9_tháng 10_tháng 11_tháng 12".split(
      "_"
    ),
  monthsShort: "Th1_Th2_Th3_Th4_Th5_Th6_Th7_Th8_Th9_Th10_Th11_Th12".split("_"),
  weekdays: "Chủ nhật_Thứ hai_Thứ ba_Thứ tư_Thứ năm_Thứ sáu_Thứ bảy".split("_"),
  weekdaysShort: "CN_T2_T3_T4_T5_T6_T7".split("_"),
  weekdaysMin: "CN_T2_T3_T4_T5_T6_T7".split("_"),
  weekStart: 1,
  formats: {
    LT: "HH:mm",
    LTS: "HH:mm:ss",
    L: "DD/MM/YYYY",
    LL: "D MMMM [năm] YYYY",
    LLL: "D MMMM [năm] YYYY HH:mm",
    LLLL: "dddd, D MMMM [năm] YYYY HH:mm",
  },
  calendar: {
    sameDay: "[Hôm nay lúc] LT",
    nextDay: "[Ngày mai lúc] LT",
    nextWeek: "dddd [tuần tới lúc] LT",
    lastDay: "[Hôm qua lúc] LT",
    lastWeek: "dddd [tuần trước lúc] LT",
    sameElse: "L",
  },
  relativeTime: {
    future: "%s tới",
    past: "%s trước",
    s: "vài giây",
    m: "một phút",
    mm: "%d phút",
    h: "một giờ",
    hh: "%d giờ",
    d: "một ngày",
    dd: "%d ngày",
    M: "một tháng",
    MM: "%d tháng",
    y: "một năm",
    yy: "%d năm",
  },
};

const viOverrides: Record<string, string> = {
  // Composer
  "Send a message": "Nhắn tin",
  Send: "Gửi",
  "Sending...": "Đang gửi...",
  "Empty message...": "Tin nhắn trống...",
  "Message failed to send": "Không gửi được tin nhắn",
  "Send message request failed": "Không gửi được tin nhắn",
  "Open emoji picker": "Mở bảng biểu tượng cảm xúc",

  // Message list
  "Nothing yet...": "Chưa có gì ở đây...",
  "Send a message to start the conversation": "Gửi tin nhắn để bắt đầu trò chuyện",
  "No chats here yet…": "Chưa có cuộc trò chuyện nào…",
  "New Messages!": "Tin nhắn mới!",
  "Unread messages": "Tin nhắn chưa đọc",
  "{{count}} new messages_one": "{{count}} tin nhắn mới",
  "{{count}} new messages_other": "{{count}} tin nhắn mới",
  "{{count}} unread_one": "{{count}} chưa đọc",
  "{{count}} unread_other": "{{count}} chưa đọc",
  "Message deleted": "Tin nhắn đã bị xoá",
  Edited: "Đã chỉnh sửa",
  Delivered: "Đã gửi",
  You: "Bạn",

  // Typing
  "{{ user }} is typing...": "{{ user }} đang nhập...",
  "{{ users }} and {{ user }} are typing...":
    "{{ users }} và {{ user }} đang nhập...",
  "{{ users }} and more are typing...": "{{ users }} và những người khác đang nhập...",
  "{{ typing }} is typing": "{{ typing }} đang nhập",
  "{{ typing }} are typing": "{{ typing }} đang nhập",
  "{{ count }} people are typing_one": "{{ count }} người đang nhập",
  "{{ count }} people are typing_other": "{{ count }} người đang nhập",

  // Message actions
  Reply: "Trả lời",
  "Quote Reply": "Trích dẫn trả lời",
  "Edit Message": "Chỉnh sửa tin nhắn",
  "Copy Message": "Sao chép tin nhắn",
  Delete: "Xoá",
  "Delete message": "Xoá tin nhắn",
  "Delete for me": "Xoá với tôi",
  "Mark as unread": "Đánh dấu chưa đọc",
  Flag: "Báo cáo",
  Mute: "Tắt thông báo",
  Unmute: "Bật thông báo",
  Pin: "Ghim",
  Unpin: "Bỏ ghim",
  Cancel: "Huỷ",
  Ok: "Đồng ý",
  "Are you sure you want to delete this message?":
    "Bạn có chắc muốn xoá tin nhắn này không?",

  // Errors
  Error: "Lỗi",
  "Error: {{ errorMessage }}": "Lỗi: {{ errorMessage }}",
  "Error deleting message": "Không xoá được tin nhắn",
  "Failed to load channels": "Không tải được cuộc trò chuyện",
  "Failed to mark channel as read": "Không đánh dấu đã đọc được",
  "Connection failure, reconnecting now...":
    "Mất kết nối, đang kết nối lại...",
  "Error connecting to chat, refresh the page to try again.":
    "Không kết nối được, hãy tải lại trang để thử lại.",

  // Timestamps
  "timestamp/relativeToday": "Hôm nay",
  "timestamp/relativeYesterday": "Hôm qua",
  "timestamp/relativeDaysAgo": "{{ count }} ngày trước",
  "timestamp/relativeWeeksAgo": "{{ count }} tuần trước",
  "timestamp/DateSeparator":
    '{{ timestamp | timestampFormatter(calendar: true; calendarFormats: { "sameDay": "[Hôm nay]", "nextDay": "[Ngày mai]", "lastDay": "[Hôm qua]", "nextWeek": "dddd", "lastWeek": "dddd [tuần trước]", "sameElse": "D MMM, YYYY" }) }}',
  "timestamp/ChannelPreviewTimestamp":
    '{{ timestamp | timestampFormatter(calendar: true; calendarFormats: { "sameDay": "LT", "lastDay": "[Hôm qua]", "lastWeek": "dddd", "sameElse": "L" }) }}',
};

/* One instance per locale for the lifetime of the tab. Building a new
   Streami18n on every render would hand <Chat> a fresh translator each time
   and re-initialise i18next underneath the mounted tree. */
const instances = new Map<Locale, Streami18n>();

export function streamI18n(locale: Locale): Streami18n {
  const cached = instances.get(locale);
  if (cached) return cached;

  const instance =
    locale === "vi"
      ? new Streami18n({
          language: "vi",
          translationsForLanguage: { ...enTranslations, ...viOverrides },
          dayjsLocaleConfigForLanguage: viDayjsLocale,
        })
      : new Streami18n({ language: "en" });

  instances.set(locale, instance);
  return instance;
}
