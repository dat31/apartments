import { Streami18n } from "stream-chat-react";
import type { Locale } from "@/i18n/routing";

/* Stream's own UI strings, in the app's language.

   The SDK renders a whole layer of text that never passes through next-intl —
   the message-actions menu, date separators, the unread divider, typing and
   delivery indicators, send/upload failures. Left alone that layer stays
   English while everything around it is Vietnamese, which is the more jarring
   half of the screen. `Streami18n` is the SDK's sanctioned channel for it and
   `<Chat i18nInstance>` is where it plugs in.

   Only Vietnamese needs a table — `en` is the SDK's own default. The keys
   below are the ones this app's surface can actually reach: it mounts no
   polls, no audio recorder, no moderation queue and no attachments, so the
   catalog's other ~600 keys would be dead weight. Anything unlisted falls
   back to Stream's English rather than rendering blank. */

const viTranslations = {
  /* ---- message actions ---- */
  "Edit Message": "Sửa tin nhắn",
  Delete: "Xóa",
  "Delete message": "Xóa tin nhắn",
  "Delete for me": "Xóa ở phía tôi",
  "Are you sure you want to delete this message?":
    "Bạn có chắc muốn xóa tin nhắn này?",
  "Copy Message": "Sao chép tin nhắn",
  Flag: "Báo cáo",
  Mute: "Tắt thông báo",
  Unmute: "Bật lại thông báo",
  Pin: "Ghim",
  Unpin: "Bỏ ghim",
  "Mark as unread": "Đánh dấu chưa đọc",
  Cancel: "Hủy",
  Close: "Đóng",

  /* ---- threads ---- */
  Reply: "Trả lời",
  "Reply to Message": "Trả lời tin nhắn",
  "Quote Reply": "Trích dẫn trả lời",
  Thread: "Luồng trả lời",
  "Thread Reply": "Trả lời trong luồng",
  "Thread reply": "Trả lời trong luồng",
  "Replied to a thread": "Đã trả lời trong luồng",
  "Reply to a message to start a thread":
    "Trả lời một tin nhắn để bắt đầu luồng",
  "Thread has not been found": "Không tìm thấy luồng trả lời",
  replyCount_one: "1 trả lời",
  replyCount_other: "{{ count }} trả lời",

  /* ---- composer ---- */
  Send: "Gửi",
  "Send a message": "Nhập tin nhắn…",
  "Empty message...": "Tin nhắn trống…",
  "Slow Mode ON": "Chế độ chậm đang bật",

  /* ---- message state ---- */
  Edited: "Đã chỉnh sửa",
  Delivered: "Đã gửi",
  New: "Mới",
  "New Messages!": "Tin nhắn mới!",
  "Nothing yet...": "Chưa có gì…",
  "Message deleted": "Tin nhắn đã bị xóa",
  "Message pinned": "Đã ghim tin nhắn",
  "Message unpinned": "Đã bỏ ghim tin nhắn",
  "Message marked as unread": "Đã đánh dấu tin nhắn là chưa đọc",
  "Message has been successfully flagged": "Đã báo cáo tin nhắn",
  "this content could not be displayed": "không hiển thị được nội dung này",
  "New message from {{user}}": "Tin nhắn mới từ {{user}}",
  "{{count}} unread_one": "{{count}} chưa đọc",
  "{{count}} unread_other": "{{count}} chưa đọc",
  "{{count}} new messages_one": "{{count}} tin nhắn mới",
  "{{count}} new messages_other": "{{count}} tin nhắn mới",

  /* ---- typing ---- */
  "{{ user }} is typing...": "{{ user }} đang nhập…",
  "{{ users }} and {{ user }} are typing...":
    "{{ users }} và {{ user }} đang nhập…",
  "{{ users }} and more are typing...":
    "{{ users }} và những người khác đang nhập…",
  "{{ typing }} is typing": "{{ typing }} đang nhập",
  "{{ typing }} are typing": "{{ typing }} đang nhập",

  /* ---- failures ---- */
  Error: "Lỗi",
  "Error: {{ errorMessage }}": "Lỗi: {{ errorMessage }}",
  "Message failed to send": "Không gửi được tin nhắn",
  "Error deleting message": "Không xóa được tin nhắn",
  "Error pinning message": "Không ghim được tin nhắn",
  "Error removing message pin": "Không bỏ ghim được tin nhắn",
  "Error adding flag": "Không báo cáo được tin nhắn",
  "Error muting user": "Không tắt được thông báo từ người này",
  "Error unmuting user": "Không bật lại được thông báo từ người này",
  "Error connecting to chat, refresh the page to try again.":
    "Không kết nối được với tin nhắn. Vui lòng tải lại trang.",
  "Connection failure, reconnecting now...":
    "Mất kết nối, đang kết nối lại…",
  "Failed to load channels": "Không tải được danh sách cuộc trò chuyện",
  "Failed to load more channels": "Không tải thêm được cuộc trò chuyện",
  "Failed to mark channel as read": "Không đánh dấu đã đọc được",
  "Failed to jump to the first unread message":
    "Không chuyển được tới tin nhắn chưa đọc đầu tiên",

  /* ---- empty states (the inbox overrides its own, these are the SDK's
          remaining ones) ---- */
  "No chats here yet…": "Chưa có cuộc trò chuyện nào…",
  "No conversations yet": "Chưa có cuộc trò chuyện nào",
  You: "Bạn",

  /* ---- timestamps ----
     Every timestamp the UI renders needs a key here, not just the ones whose
     wording changes: Streami18n runs with `fallbackLng: false`, so a key this
     table omits doesn't fall back to Stream's English — `t()` hands the key
     straight back, and the SDK's getDateString takes that as "no format" and
     prints the raw dayjs default, i.e. `2026-07-22T15:55:17+07:00`.

     The calendar tokens are part of the string, so translating the label
     means restating the whole formatter directive. `dddd` / `MMM` and the
     localized `LT` / `L` slots resolve against the dayjs locale supplied
     below. */
  "timestamp/relativeToday": "Hôm nay",
  "timestamp/relativeYesterday": "Hôm qua",
  "timestamp/DateSeparator":
    '{{ timestamp | timestampFormatter(calendar: true; calendarFormats: { "sameDay": "[Hôm nay]", "nextDay": "[Ngày mai]", "lastDay": "[Hôm qua]", "nextWeek": "dddd", "lastWeek": "dddd [tuần trước]", "sameElse": "ddd, D MMM" }) }}',
  /* The conversation rows in the inbox: clock time today, "Hôm qua"
     yesterday, the weekday within the week, a date beyond that. */
  "timestamp/ChannelPreviewTimestamp":
    '{{ timestamp | timestampFormatter(calendar: true; calendarFormats: { "sameDay": "LT", "lastDay": "[Hôm qua]", "lastWeek": "dddd", "sameElse": "L" }) }}',
  /* Under a message bubble — the day is already carried by the date
     separator above it, so this is clock time only. */
  "timestamp/MessageTimestamp":
    "{{ timestamp | timestampFormatter(calendar: false; format: HH:mm) }}",

  /* ---- screen-reader labels ---- */
  "aria/Open Thread": "Mở luồng trả lời",
  "aria/Close thread": "Đóng luồng trả lời",
  "aria/Quote Message": "Trích dẫn tin nhắn",
  "aria/Cancel Reply": "Hủy trả lời",
  "aria/Jump to latest message": "Tới tin nhắn mới nhất",
  "aria/Jump to quoted message": "Tới tin nhắn được trích dẫn",
  "aria/Message from {{ user }},": "Tin nhắn từ {{ user }},",
  "aria/Press Enter to start typing": "Nhấn Enter để bắt đầu nhập",
  "aria/Delivered": "Đã gửi",
  "aria/Copy Message Text": "Sao chép nội dung tin nhắn",
  "aria/Mark Message Unread": "Đánh dấu tin nhắn chưa đọc",
  "aria/Unpin Message": "Bỏ ghim tin nhắn",
  "aria/Resend Message": "Gửi lại tin nhắn",
};

/* Stream bundles dayjs locales for the twelve languages it ships translations
   for; Vietnamese is not among them, so the weekday and month names the
   formatter directives above interpolate have to travel with the config.

   `formats` matters as much as the names: Stream registers this config on top
   of dayjs' *English* locale, so anything left out keeps the English shape —
   `LT` would render 3:55 PM and `L` 07/22/2026 in a Vietnamese UI. The values
   are dayjs' own `locale/vi`, restated here rather than imported because the
   locale has to reach the dayjs instance bundled inside the SDK. */
const viDayjsLocale = {
  weekStart: 1,
  formats: {
    LT: "HH:mm",
    LTS: "HH:mm:ss",
    L: "DD/MM/YYYY",
    LL: "D MMMM [năm] YYYY",
    LLL: "D MMMM [năm] YYYY HH:mm",
    LLLL: "dddd, D MMMM [năm] YYYY HH:mm",
    l: "DD/M/YYYY",
    ll: "D MMM YYYY",
    lll: "D MMM YYYY HH:mm",
    llll: "ddd, D MMM YYYY HH:mm",
  },
  weekdays: [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ],
  weekdaysShort: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  weekdaysMin: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  months: [
    "tháng 1",
    "tháng 2",
    "tháng 3",
    "tháng 4",
    "tháng 5",
    "tháng 6",
    "tháng 7",
    "tháng 8",
    "tháng 9",
    "tháng 10",
    "tháng 11",
    "tháng 12",
  ],
  monthsShort: [
    "Th01",
    "Th02",
    "Th03",
    "Th04",
    "Th05",
    "Th06",
    "Th07",
    "Th08",
    "Th09",
    "Th10",
    "Th11",
    "Th12",
  ],
};

/* One instance per language, reused for the lifetime of the tab: Streami18n
   builds an i18next instance in its constructor, and handing <Chat> a fresh
   one on every render would re-initialise the whole translation layer. */
const instances = new Map<Locale, Streami18n>();

export function streamI18n(locale: Locale): Streami18n {
  const existing = instances.get(locale);
  if (existing) return existing;

  const instance =
    locale === "vi"
      ? new Streami18n({
          language: "vi",
          translationsForLanguage: viTranslations,
          dayjsLocaleConfigForLanguage: viDayjsLocale,
        })
      : new Streami18n({ language: "en" });

  instances.set(locale, instance);
  return instance;
}
